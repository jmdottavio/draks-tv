import { getAuth } from "@/src/features/auth/auth.repository";
import {
	getFavoriteChannelIds,
	getProfileImagesByChannelIds,
	removeUnfollowedChannels,
	updateLatestVod,
	updateLatestVods,
	updateLiveStates,
	upsertFollowedChannels,
} from "@/src/features/channels/followed-channels.repository";
import { upsertVodsFromTwitch } from "@/src/features/vods/vods.repository";
import {
	getFollowedChannels,
	getFollowedStreams,
	getUsers,
	getVideos,
} from "@/src/services/twitch-service";

import type { TwitchFollowedChannel, TwitchStream } from "@/src/services/twitch-service";

const VOD_REFRESH_INTERVAL_MS = 30 * 60 * 1000;
const VIDEOS_FETCH_LIMIT = 5;
const BATCH_SIZE = 3;
const BATCH_DELAY_MS = 500;
const TWITCH_USERS_FETCH_LIMIT = 100;

type LatestVodUpdate = {
	vodId: string;
	vodCreatedAt: string;
};

type ScheduledUpdateState = {
	refreshIntervalId: ReturnType<typeof setInterval> | null;
	liveStateFlushTimeoutId: ReturnType<typeof setTimeout> | null;
	latestVodFlushTimeoutId: ReturnType<typeof setTimeout> | null;
	pendingLiveChannelIds: Set<string>;
	pendingLatestVodUpdates: Map<string, LatestVodUpdate>;
	pendingLiveUpdateLabels: Set<string>;
	pendingLiveUpdateRequestCount: number;
	pendingLatestVodUpdateRequestCount: number;
	pendingLiveUpdateShouldRefreshOffline: boolean;
	liveStateFlushScheduledAtMs: number | null;
	latestVodFlushScheduledAtMs: number | null;
};

type FollowedChannelUpsertInput = {
	channelId: string;
	channelName: string;
	profileImageUrl: string;
	followedAt: string | null;
};

const scheduledUpdateState: ScheduledUpdateState = {
	refreshIntervalId: null,
	liveStateFlushTimeoutId: null,
	latestVodFlushTimeoutId: null,
	pendingLiveChannelIds: new Set<string>(),
	pendingLatestVodUpdates: new Map<string, LatestVodUpdate>(),
	pendingLiveUpdateLabels: new Set<string>(),
	pendingLiveUpdateRequestCount: 0,
	pendingLatestVodUpdateRequestCount: 0,
	pendingLiveUpdateShouldRefreshOffline: false,
	liveStateFlushScheduledAtMs: null,
	latestVodFlushScheduledAtMs: null,
};

function logMemoryUsage(label: string): void {
	const memory = process.memoryUsage();
	const toMb = (value: number) => Math.round((value / 1024 / 1024) * 10) / 10;
	console.log(
		`[video-cache] ${label} - rss=${toMb(memory.rss)}MB heapUsed=${toMb(memory.heapUsed)}MB heapTotal=${toMb(memory.heapTotal)}MB external=${toMb(memory.external)}MB`,
	);
}

function logQueueTelemetry(
	label: string,
	queueLagMs: number,
	liveRequestCount: number,
	liveChannelCount: number,
	vodRequestCount: number,
	vodChannelCount: number,
) : void {

	const shouldLogQueueStats =
		liveRequestCount > 10 ||
		vodRequestCount > 10 ||
		liveChannelCount > 30 ||
		vodChannelCount > 30 ||
		queueLagMs > 100;

	if (!shouldLogQueueStats) {
		return;
	}

	const memory = process.memoryUsage();
	const toMb = (value: number) => Math.round((value / 1024 / 1024) * 10) / 10;
	console.log(
		`[video-cache] ${label} queueLagMs=${queueLagMs} liveRequests=${liveRequestCount} liveChannels=${liveChannelCount} vodRequests=${vodRequestCount} vodChannels=${vodChannelCount} rss=${toMb(memory.rss)}MB external=${toMb(memory.external)}MB`,
	);
}

function getLiveStateLogLabel(): string {
	if (scheduledUpdateState.pendingLiveUpdateLabels.size === 0) {
		return "live-state-update";
	}

	if (scheduledUpdateState.pendingLiveUpdateLabels.size === 1) {
		const firstLabel = scheduledUpdateState.pendingLiveUpdateLabels.values().next().value;
		if (typeof firstLabel === "string" && firstLabel.length > 0) {
			return firstLabel;
		}
	}

	return "live-state-update-batch";
}

function flushScheduledLiveStateUpdates(): void {
	scheduledUpdateState.liveStateFlushTimeoutId = null;

	const liveChannelIds = Array.from(scheduledUpdateState.pendingLiveChannelIds);
	const liveUpdateLabels = Array.from(scheduledUpdateState.pendingLiveUpdateLabels);
	const shouldRefreshOffline = scheduledUpdateState.pendingLiveUpdateShouldRefreshOffline;
	const logLabel = getLiveStateLogLabel();
	const liveRequestCount = scheduledUpdateState.pendingLiveUpdateRequestCount;

	scheduledUpdateState.pendingLiveChannelIds.clear();
	scheduledUpdateState.pendingLiveUpdateLabels.clear();
	scheduledUpdateState.pendingLiveUpdateShouldRefreshOffline = false;
	scheduledUpdateState.pendingLiveUpdateRequestCount = 0;

	let queueLagMs = 0;
	if (scheduledUpdateState.liveStateFlushScheduledAtMs !== null) {
		queueLagMs = Date.now() - scheduledUpdateState.liveStateFlushScheduledAtMs;
	}
	scheduledUpdateState.liveStateFlushScheduledAtMs = null;

	logQueueTelemetry(
		"live-state-flush",
		queueLagMs,
		liveRequestCount,
		liveChannelIds.length,
		scheduledUpdateState.pendingLatestVodUpdateRequestCount,
		scheduledUpdateState.pendingLatestVodUpdates.size,
	);

	const lastSeenAt = new Date().toISOString();
	const updateResult = updateLiveStates(liveChannelIds, lastSeenAt);
	if (updateResult instanceof Error) {
		for (const liveChannelId of liveChannelIds) {
			scheduledUpdateState.pendingLiveChannelIds.add(liveChannelId);
		}
		for (const liveUpdateLabel of liveUpdateLabels) {
			scheduledUpdateState.pendingLiveUpdateLabels.add(liveUpdateLabel);
		}
		scheduledUpdateState.pendingLiveUpdateShouldRefreshOffline =
			scheduledUpdateState.pendingLiveUpdateShouldRefreshOffline || shouldRefreshOffline;
		scheduledUpdateState.pendingLiveUpdateRequestCount += liveRequestCount;

		if (scheduledUpdateState.liveStateFlushTimeoutId === null) {
			scheduledUpdateState.liveStateFlushScheduledAtMs = Date.now();
			scheduledUpdateState.liveStateFlushTimeoutId = setTimeout(
				flushScheduledLiveStateUpdates,
				1000,
			);
		}

		console.warn(`[${logLabel}] Failed to update live states:`, updateResult.message);
		return;
	}

	if (shouldRefreshOffline && updateResult.length > 0) {
		refreshVideosForChannels(updateResult).catch((error: unknown) => {
			console.error(`[${logLabel}] Failed to refresh offline channels:`, error);
		});
	}
}

function shouldReplacePendingVodUpdate(
	currentPendingUpdate: LatestVodUpdate,
	nextVodId: string,
	nextVodCreatedAt: string,
): boolean {
	if (currentPendingUpdate.vodId === nextVodId) {
		return false;
	}

	const currentCreatedAt = Date.parse(currentPendingUpdate.vodCreatedAt);
	const nextCreatedAt = Date.parse(nextVodCreatedAt);

	if (!Number.isNaN(currentCreatedAt) && !Number.isNaN(nextCreatedAt)) {
		return nextCreatedAt >= currentCreatedAt;
	}

	if (!Number.isNaN(nextCreatedAt)) {
		return true;
	}

	return false;
}

function flushScheduledLatestVodUpdates(): void {
	scheduledUpdateState.latestVodFlushTimeoutId = null;

	const updates = Array.from(scheduledUpdateState.pendingLatestVodUpdates.entries());
	const vodRequestCount = scheduledUpdateState.pendingLatestVodUpdateRequestCount;

	scheduledUpdateState.pendingLatestVodUpdates.clear();
	scheduledUpdateState.pendingLatestVodUpdateRequestCount = 0;

	let queueLagMs = 0;
	if (scheduledUpdateState.latestVodFlushScheduledAtMs !== null) {
		queueLagMs = Date.now() - scheduledUpdateState.latestVodFlushScheduledAtMs;
	}
	scheduledUpdateState.latestVodFlushScheduledAtMs = null;

	logQueueTelemetry(
		"latest-vod-flush",
		queueLagMs,
		scheduledUpdateState.pendingLiveUpdateRequestCount,
		scheduledUpdateState.pendingLiveChannelIds.size,
		vodRequestCount,
		updates.length,
	);

	const bulkUpdates: Array<{ channelId: string; vodId: string; vodCreatedAt: string }> = [];
	for (const [channelId, update] of updates) {
		bulkUpdates.push({ channelId, vodId: update.vodId, vodCreatedAt: update.vodCreatedAt });
	}

	const updateResult = updateLatestVods(bulkUpdates);
	const hasUpdateError = updateResult instanceof Error;
	if (hasUpdateError) {
		console.warn("[videos-api] Failed to update latest VOD batch:", updateResult.message);
	}

	if (hasUpdateError) {
		for (const [channelId, update] of updates) {
			scheduledUpdateState.pendingLatestVodUpdates.set(channelId, update);
		}
		scheduledUpdateState.pendingLatestVodUpdateRequestCount += vodRequestCount;

		if (scheduledUpdateState.latestVodFlushTimeoutId === null) {
			scheduledUpdateState.latestVodFlushScheduledAtMs = Date.now();
			scheduledUpdateState.latestVodFlushTimeoutId = setTimeout(
				flushScheduledLatestVodUpdates,
				1000,
			);
		}
	}
}

function chunkArray<T>(items: Array<T>, size: number): Array<Array<T>> {
	const chunks: Array<Array<T>> = [];
	for (let index = 0; index < items.length; index += size) {
		chunks.push(items.slice(index, index + size));
	}
	return chunks;
}

async function fetchProfileImages(channelIds: Array<string>): Promise<Map<string, string>> {
	const profileImages = new Map<string, string>();
	const channelBatches = chunkArray(channelIds, TWITCH_USERS_FETCH_LIMIT);
	const userFetchPromises: Array<Promise<Awaited<ReturnType<typeof getUsers>>>> = [];

	for (const batch of channelBatches) {
		userFetchPromises.push(getUsers({ ids: batch }));
	}

	const results = await Promise.all(userFetchPromises);

	for (const result of results) {
		if (result instanceof Error) {
			continue;
		}
		for (const user of result) {
			profileImages.set(user.id, user.profileImageUrl);
		}
	}

	return profileImages;
}

function collectChannelIds(channels: Array<TwitchFollowedChannel>): Array<string> {
	const channelIds: Array<string> = [];

	for (const channel of channels) {
		channelIds.push(channel.broadcasterId);
	}

	return channelIds;
}

function collectMissingProfileIds(
	channelIds: Array<string>,
	profileImages: Map<string, string>,
): Array<string> {
	const missingProfileIds: Array<string> = [];

	for (const channelId of channelIds) {
		if (!profileImages.has(channelId)) {
			missingProfileIds.push(channelId);
		}
	}

	return missingProfileIds;
}

function getExistingProfileImages(
	missingProfileIds: Array<string>,
): Map<string, string> | Error {
	if (missingProfileIds.length === 0) {
		return new Map<string, string>();
	}

	const existingResult = getProfileImagesByChannelIds(missingProfileIds);
	if (existingResult instanceof Error) {
		return existingResult;
	}

	return existingResult;
}

function buildFollowedChannelUpsertInputs(
	followedChannels: Array<TwitchFollowedChannel>,
	fetchedProfileImages: Map<string, string>,
	existingProfileImages: Map<string, string>,
): Array<FollowedChannelUpsertInput> {
	const upsertInputs: Array<FollowedChannelUpsertInput> = [];

	for (const channel of followedChannels) {
		const fetchedProfileImage = fetchedProfileImages.get(channel.broadcasterId);
		let profileImageUrl = "";

		if (fetchedProfileImage !== undefined) {
			profileImageUrl = fetchedProfileImage;
		} else {
			const existingProfileImage = existingProfileImages.get(channel.broadcasterId);
			if (existingProfileImage !== undefined) {
				profileImageUrl = existingProfileImage;
			}
		}

		upsertInputs.push({
			channelId: channel.broadcasterId,
			channelName: channel.broadcasterName,
			profileImageUrl,
			followedAt: channel.followedAt,
		});
	}

	return upsertInputs;
}

async function refreshFollowedChannels(): Promise<Error | null> {
	const auth = getAuth();
	if (auth instanceof Error) {
		return auth;
	}

	if (auth.accessToken === null || auth.userId === null) {
		return new Error("Not authenticated");
	}

	const followedResult = await getFollowedChannels(auth.userId);
	if (followedResult instanceof Error) {
		return followedResult;
	}

	const channelIds = collectChannelIds(followedResult);
	const profileImages = await fetchProfileImages(channelIds);
	const missingProfileIds = collectMissingProfileIds(channelIds, profileImages);
	const existingProfileImagesResult = getExistingProfileImages(missingProfileIds);
	if (existingProfileImagesResult instanceof Error) {
		return existingProfileImagesResult;
	}

	const upsertInputs = buildFollowedChannelUpsertInputs(
		followedResult,
		profileImages,
		existingProfileImagesResult,
	);
	const fetchedAt = new Date().toISOString();

	const upsertResult = upsertFollowedChannels(upsertInputs, fetchedAt);
	if (upsertResult instanceof Error) {
		return upsertResult;
	}

	const removeResult = removeUnfollowedChannels(channelIds);
	if (removeResult instanceof Error) {
		return removeResult;
	}

	return null;
}

async function refreshVideosForChannel(channelId: string): Promise<Error | null> {
	const videosResult = await getVideos(channelId, VIDEOS_FETCH_LIMIT);
	if (videosResult instanceof Error) {
		return videosResult;
	}

	if (videosResult.length === 0) {
		return null;
	}

	const upsertResult = upsertVodsFromTwitch(videosResult);
	if (upsertResult instanceof Error) {
		return upsertResult;
	}

	const newestVideo = videosResult[0];
	if (newestVideo === undefined) {
		return null;
	}

	const updateResult = updateLatestVod(channelId, newestVideo.id, newestVideo.createdAt);
	if (updateResult instanceof Error) {
		return updateResult;
	}

	return null;
}

export async function refreshVideosForChannels(channelIds: Array<string>): Promise<void> {
	for (let batchStart = 0; batchStart < channelIds.length; batchStart += BATCH_SIZE) {
		const batch = channelIds.slice(batchStart, batchStart + BATCH_SIZE);
		const refreshPromises: Array<Promise<Error | null>> = [];

		for (const channelId of batch) {
			refreshPromises.push(refreshVideosForChannel(channelId));
		}

		const refreshResults = await Promise.allSettled(refreshPromises);

		for (const [resultIndex, refreshResult] of refreshResults.entries()) {
			const channelId = batch[resultIndex] ?? "unknown";

			if (refreshResult.status === "rejected") {
				console.warn(
					`[video-cache] Failed to refresh videos for ${channelId}:`,
					refreshResult.reason,
				);
				continue;
			}

			if (refreshResult.value instanceof Error) {
				console.warn(
					`[video-cache] Failed to refresh videos for ${channelId}:`,
					refreshResult.value.message,
				);
			}
		}

		if (batchStart + BATCH_SIZE < channelIds.length) {
			await new Promise((resolve) => setTimeout(resolve, BATCH_DELAY_MS));
		}
	}
}

export function scheduleLiveStateUpdate(
	liveChannelIds: Array<string>,
	logLabel: string,
	shouldRefreshOffline: boolean,
): void {
	for (const liveChannelId of liveChannelIds) {
		scheduledUpdateState.pendingLiveChannelIds.add(liveChannelId);
	}

	scheduledUpdateState.pendingLiveUpdateLabels.add(logLabel);
	scheduledUpdateState.pendingLiveUpdateShouldRefreshOffline =
		scheduledUpdateState.pendingLiveUpdateShouldRefreshOffline || shouldRefreshOffline;
	scheduledUpdateState.pendingLiveUpdateRequestCount += 1;

	if (scheduledUpdateState.liveStateFlushTimeoutId !== null) {
		return;
	}

	scheduledUpdateState.liveStateFlushScheduledAtMs = Date.now();
	scheduledUpdateState.liveStateFlushTimeoutId = setTimeout(flushScheduledLiveStateUpdates, 0);
}

export function scheduleLatestVodUpdate(channelId: string, vodId: string, vodCreatedAt: string): void {
	scheduledUpdateState.pendingLatestVodUpdateRequestCount += 1;

	const currentPendingUpdate = scheduledUpdateState.pendingLatestVodUpdates.get(channelId);
	if (currentPendingUpdate === undefined) {
		scheduledUpdateState.pendingLatestVodUpdates.set(channelId, { vodId, vodCreatedAt });
	} else if (shouldReplacePendingVodUpdate(currentPendingUpdate, vodId, vodCreatedAt)) {
		scheduledUpdateState.pendingLatestVodUpdates.set(channelId, { vodId, vodCreatedAt });
	}

	if (scheduledUpdateState.latestVodFlushTimeoutId !== null) {
		return;
	}

	scheduledUpdateState.latestVodFlushScheduledAtMs = Date.now();
	scheduledUpdateState.latestVodFlushTimeoutId = setTimeout(flushScheduledLatestVodUpdates, 0);
}

export async function populateInitialCache(): Promise<Error | null> {
	console.log("[video-cache] Starting initial cache population...");

	const refreshResult = await refreshFollowedChannels();
	if (refreshResult instanceof Error) {
		console.warn("[video-cache] Failed to refresh followed channels:", refreshResult.message);
	}

	const favorites = getFavoriteChannelIds();
	if (favorites instanceof Error) {
		console.error("[video-cache] Failed to get favorites:", favorites.message);
		return favorites;
	}

	await refreshVideosForChannels(favorites);

	return null;
}

export function startBackgroundRefresh(): void {
	if (scheduledUpdateState.refreshIntervalId !== null) {
		clearInterval(scheduledUpdateState.refreshIntervalId);
	}

	async function refreshTask(): Promise<void> {
		logMemoryUsage("refresh start");
		const followResult = await refreshFollowedChannels();
		if (followResult instanceof Error) {
			console.warn("[video-cache] Followed channel refresh failed:", followResult.message);
		}

		const favorites = getFavoriteChannelIds();
		if (favorites instanceof Error) {
			console.warn("[video-cache] Favorite lookup failed:", favorites.message);
			return;
		}

		await refreshVideosForChannels(favorites);
		logMemoryUsage("refresh end");
	}

	refreshTask().catch((error: unknown) => {
		console.error("[video-cache] Initial background refresh failed:", error);
	});

	scheduledUpdateState.refreshIntervalId = setInterval(() => {
		refreshTask().catch((error: unknown) => {
			console.error("[video-cache] Background refresh failed:", error);
		});
	}, VOD_REFRESH_INTERVAL_MS);

	console.log("[video-cache] Background refresh started");
}

function resetPendingScheduledUpdates(): void {
	if (scheduledUpdateState.liveStateFlushTimeoutId !== null) {
		clearTimeout(scheduledUpdateState.liveStateFlushTimeoutId);
		scheduledUpdateState.liveStateFlushTimeoutId = null;
	}

	if (scheduledUpdateState.latestVodFlushTimeoutId !== null) {
		clearTimeout(scheduledUpdateState.latestVodFlushTimeoutId);
		scheduledUpdateState.latestVodFlushTimeoutId = null;
	}

	scheduledUpdateState.pendingLiveChannelIds.clear();
	scheduledUpdateState.pendingLatestVodUpdates.clear();
	scheduledUpdateState.pendingLiveUpdateLabels.clear();
	scheduledUpdateState.pendingLiveUpdateRequestCount = 0;
	scheduledUpdateState.pendingLatestVodUpdateRequestCount = 0;
	scheduledUpdateState.pendingLiveUpdateShouldRefreshOffline = false;
	scheduledUpdateState.liveStateFlushScheduledAtMs = null;
	scheduledUpdateState.latestVodFlushScheduledAtMs = null;
}

export function stopBackgroundRefresh(): void {
	if (scheduledUpdateState.refreshIntervalId !== null) {
		clearInterval(scheduledUpdateState.refreshIntervalId);
		scheduledUpdateState.refreshIntervalId = null;
	}

	resetPendingScheduledUpdates();

	console.log("[video-cache] Background refresh stopped");
}

export async function refreshLiveStreams(): Promise<Array<TwitchStream> | Error> {
	const auth = getAuth();
	if (auth instanceof Error) {
		return auth;
	}

	if (auth.accessToken === null || auth.userId === null) {
		return new Error("Not authenticated");
	}

	return getFollowedStreams(auth.userId);
}
