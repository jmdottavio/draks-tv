import { and, eq, sql } from "drizzle-orm";

import { database } from "@/src/db";
import { cachedVods, channelCache } from "@/src/db/schema";
import { getAllFavorites } from "@/src/features/channels/favorites.repository";
import {
	getChannelCacheBulk,
	processLiveStateChangesAtomic,
} from "@/src/features/vods/channel-cache.repository";
import { getVideos } from "@/src/services/twitch-service";

import type { TwitchStream } from "@/src/services/twitch-service";

const VIDEO_CACHE_TTL_MS = 30 * 60 * 1000;
const VIDEOS_FETCH_LIMIT = 5;
const BATCH_SIZE = 3;
const BATCH_DELAY_MS = 500;
const BASE_BACKOFF_MS = 60 * 1000; // 1 minute
const MAX_BACKOFF_MS = 60 * 60 * 1000; // 1 hour
const MIN_REFRESH_INTERVAL_MS = 5000;
const MAX_REFRESH_INTERVAL_MS = 5 * 60 * 1000;

// Track background refresh state
let refreshIntervalId: ReturnType<typeof setTimeout> | null = null;
const channelBackoffState = new Map<string, { failureCount: number; nextAttemptAt: number }>();

// Cleanup interval for stale backoff entries
let cleanupIntervalId: ReturnType<typeof setInterval> | null = null;

function calculateBackoffWithJitter(failureCount: number) {
	const baseBackoff = BASE_BACKOFF_MS * Math.pow(2, failureCount - 1);
	const cappedBackoff = Math.min(baseBackoff, MAX_BACKOFF_MS);
	const jitter = Math.random() * 0.3 * cappedBackoff; // 0-30% jitter
	return Math.floor(cappedBackoff + jitter);
}

function getRefreshIntervalMs(favoriteCount: number) {
	if (favoriteCount === 0) {
		return VIDEO_CACHE_TTL_MS;
	}

	// Ensure all channels refresh within 80% of TTL (20% safety margin)
	const targetRefreshWindow = VIDEO_CACHE_TTL_MS * 0.8;
	const intervalMs = Math.floor(targetRefreshWindow / favoriteCount);

	return Math.max(MIN_REFRESH_INTERVAL_MS, Math.min(intervalMs, MAX_REFRESH_INTERVAL_MS));
}

async function refreshVideosForChannel(channelId: string) {
	// Fetch from Twitch API OUTSIDE the transaction to avoid holding DB lock during network call
	const videosResult = await getVideos(channelId, VIDEOS_FETCH_LIMIT);

	if (videosResult instanceof Error) {
		console.error("[video-cache] Failed to fetch videos from Twitch:", videosResult.message);
		return videosResult;
	}

	if (videosResult.length === 0) {
		return null;
	}

	// Perform synchronous database transaction (no async operations inside)
	try {
		const latestVideoRowId = database.transaction((transaction) => {
			let firstVideoRowId: number | undefined;

			for (const video of videosResult) {
				const result = transaction
					.insert(cachedVods)
					.values({
						videoId: video.id,
						channelId: channelId,
						title: video.title,
						duration: video.duration,
						createdAt: video.created_at,
						thumbnailUrl: video.thumbnail_url,
					})
					.onConflictDoUpdate({
						target: cachedVods.videoId,
						set: {
							title: video.title,
							duration: video.duration,
							createdAt: video.created_at,
							thumbnailUrl: video.thumbnail_url,
							fetchedAt: sql`CURRENT_TIMESTAMP`,
						},
					})
					.returning({ id: cachedVods.id })
					.get();

				if (result === undefined) {
					throw new Error("Video upsert did not return a row");
				}

				// First result is the latest (Twitch returns newest first)
				if (firstVideoRowId === undefined) {
					firstVideoRowId = result.id;
				}
			}

			if (firstVideoRowId === undefined) {
				throw new Error("No videos were upserted");
			}

			const cacheResult = transaction
				.insert(channelCache)
				.values({
					channelId: channelId,
					isLive: false,
					latestVideoId: firstVideoRowId,
				})
				.onConflictDoUpdate({
					target: channelCache.channelId,
					set: {
						latestVideoId: firstVideoRowId,
						updatedAt: sql`CURRENT_TIMESTAMP`,
					},
				})
				.returning({ channelId: channelCache.channelId })
				.get();

			if (cacheResult === undefined) {
				throw new Error("Channel cache upsert did not return a row");
			}

			transaction
				.delete(cachedVods)
				.where(
					and(
						eq(cachedVods.channelId, channelId),
						sql`${cachedVods.createdAt} < datetime('now', '-2 months')`,
					),
				)
				.run();

			return firstVideoRowId;
		});

		return latestVideoRowId;
	} catch (error) {
		console.error("[video-cache] Database transaction failed:", error);
		return error instanceof Error ? error : new Error("Database transaction failed");
	}
}

async function refreshVideosForChannelSafe(channelId: string) {
	const state = channelBackoffState.get(channelId) ?? {
		failureCount: 0,
		nextAttemptAt: 0,
	};

	const now = Date.now();
	if (now < state.nextAttemptAt) {
		return null;
	}

	const result = await refreshVideosForChannel(channelId);

	if (result instanceof Error) {
		state.failureCount++;
		const backoffMs = calculateBackoffWithJitter(state.failureCount);
		state.nextAttemptAt = now + backoffMs;
		channelBackoffState.set(channelId, state);

		if (state.failureCount >= 3) {
			console.warn(
				`[video-cache] Channel ${channelId} failed ${state.failureCount} times, backoff: ${Math.round(backoffMs / 1000)}s`,
			);
		}

		return result;
	}

	// Success - clear backoff state
	channelBackoffState.delete(channelId);
	return result;
}

async function populateInitialCache() {
	console.log("[video-cache] Starting initial cache population...");

	const favorites = getAllFavorites();

	if (favorites instanceof Error) {
		console.error("[video-cache] Failed to get favorites:", favorites.message);
		return favorites;
	}

	if (favorites.length === 0) {
		console.log("[video-cache] No favorites to cache");
		return null;
	}

	let successCount = 0;
	let errorCount = 0;

	for (
		let batchStartIndex = 0;
		batchStartIndex < favorites.length;
		batchStartIndex += BATCH_SIZE
	) {
		const batch = favorites.slice(batchStartIndex, batchStartIndex + BATCH_SIZE);

		const results = await Promise.allSettled(
			batch.map((favorite) => refreshVideosForChannel(favorite.id)),
		);

		for (const result of results) {
			if (result.status === "rejected" || result.value instanceof Error) {
				errorCount++;
			} else {
				successCount++;
			}
		}

		if (batchStartIndex + BATCH_SIZE < favorites.length) {
			await new Promise((resolve) => setTimeout(resolve, BATCH_DELAY_MS));
		}
	}

	console.log(
		`[video-cache] Initial cache population complete: ${successCount} succeeded, ${errorCount} failed`,
	);

	return null;
}

function startBackgroundRefresh() {
	if (refreshIntervalId !== null) {
		clearTimeout(refreshIntervalId);
	}

	let refreshIndex = 0;
	let currentIntervalMs = VIDEO_CACHE_TTL_MS / 20; // Initial fallback

	function scheduleNextRefresh() {
		const favorites = getAllFavorites();

		if (favorites instanceof Error) {
			console.error(
				"[video-cache] Background refresh failed to get favorites:",
				favorites.message,
			);
			refreshIntervalId = setTimeout(scheduleNextRefresh, currentIntervalMs);
			return;
		}

		if (favorites.length === 0) {
			refreshIntervalId = setTimeout(scheduleNextRefresh, currentIntervalMs);
			return;
		}

		// Recalculate interval based on current favorites count
		currentIntervalMs = getRefreshIntervalMs(favorites.length);

		const currentIndex = refreshIndex % favorites.length;
		const favorite = favorites[currentIndex];

		if (favorite !== undefined) {
			refreshVideosForChannelSafe(favorite.id)
				.then((result) => {
					if (result instanceof Error) {
						console.error(
							"[video-cache] Background refresh failed for:",
							favorite.id,
							result.message,
						);
					}
				})
				.catch((error) => {
					console.error("[video-cache] Unexpected error in background refresh:", error);
				});
		}

		refreshIndex++;
		refreshIntervalId = setTimeout(scheduleNextRefresh, currentIntervalMs);
	}

	// Start cleanup interval for stale backoff entries
	cleanupIntervalId = setInterval(
		() => {
			const favorites = getAllFavorites();
			if (favorites instanceof Error) return;

			const favoriteIds = new Set(favorites.map((favorite) => favorite.id));
			const now = Date.now();

			for (const [channelId, state] of channelBackoffState) {
				const isExpiredLongAgo = now > state.nextAttemptAt + 24 * 60 * 60 * 1000;
				if (!favoriteIds.has(channelId) || isExpiredLongAgo) {
					channelBackoffState.delete(channelId);
				}
			}
		},
		60 * 60 * 1000,
	); // Cleanup every hour

	scheduleNextRefresh();
	console.log("[video-cache] Background refresh started");
}

function stopBackgroundRefresh() {
	if (refreshIntervalId !== null) {
		clearTimeout(refreshIntervalId);
		refreshIntervalId = null;
	}
	if (cleanupIntervalId !== null) {
		clearInterval(cleanupIntervalId);
		cleanupIntervalId = null;
	}
	console.log("[video-cache] Background refresh stopped");
}

function processLiveStateChanges(currentStreams: Array<TwitchStream>) {
	const currentlyLiveChannelIds = currentStreams.map((stream) => stream.user_id);
	return processLiveStateChangesAtomic(currentlyLiveChannelIds);
}

function getChannelsWithVideos(channelIds: Array<string>) {
	return getChannelCacheBulk(channelIds);
}

async function refreshOfflineChannelsBatched(channelIds: Array<string>) {
	// Batch the refresh to avoid rate limits and overwhelming the API
	for (
		let batchStartIndex = 0;
		batchStartIndex < channelIds.length;
		batchStartIndex += BATCH_SIZE
	) {
		const batch = channelIds.slice(batchStartIndex, batchStartIndex + BATCH_SIZE);

		await Promise.allSettled(batch.map((channelId) => refreshVideosForChannelSafe(channelId)));

		if (batchStartIndex + BATCH_SIZE < channelIds.length) {
			await new Promise((resolve) => setTimeout(resolve, BATCH_DELAY_MS));
		}
	}
}

export {
	getChannelsWithVideos,
	populateInitialCache,
	processLiveStateChanges,
	refreshOfflineChannelsBatched,
	startBackgroundRefresh,
	stopBackgroundRefresh,
};
