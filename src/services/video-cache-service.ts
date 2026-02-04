import {
	getFavoriteChannelIds,
	removeUnfollowedChannels,
	updateLatestVod,
	updateLiveStates,
	upsertFollowedChannels,
} from "@/src/features/channels/followed-channels.repository";
import { upsertVodsFromTwitch } from "@/src/features/vods/vods.repository";
import { getAuth } from "@/src/features/auth/auth.repository";
import { getFollowedChannels, getFollowedStreams, getUsers, getVideos } from "@/src/services/twitch-service";


const VOD_REFRESH_INTERVAL_MS = 30 * 60 * 1000;
const VIDEOS_FETCH_LIMIT = 5;
const BATCH_SIZE = 3;
const BATCH_DELAY_MS = 500;

let refreshIntervalId: ReturnType<typeof setInterval> | null = null;

function chunkArray<T>(items: Array<T>, size: number): Array<Array<T>> {
	const chunks: Array<Array<T>> = [];
	for (let index = 0; index < items.length; index += size) {
		chunks.push(items.slice(index, index + size));
	}
	return chunks;
}

async function fetchProfileImages(channelIds: Array<string>) {
	const profileImages = new Map<string, string>();
	const channelBatches = chunkArray(channelIds, 100);

	const results = await Promise.all(
		channelBatches.map((batch) => getUsers({ ids: batch })),
	);

	for (const result of results) {
		if (result instanceof Error) {
			continue;
		}
		for (const user of result) {
			profileImages.set(user.id, user.profile_image_url);
		}
	}

	return profileImages;
}

async function refreshFollowedChannels() {
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

	const channelIds = followedResult.map((channel) => channel.broadcaster_id);
	const profileImages = await fetchProfileImages(channelIds);
	const fetchedAt = new Date().toISOString();

	const upsertInputs = followedResult.map((channel) => ({
		channelId: channel.broadcaster_id,
		channelName: channel.broadcaster_name,
		profileImageUrl: profileImages.get(channel.broadcaster_id) ?? "",
		followedAt: channel.followed_at ?? null,
	}));

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

async function refreshVideosForChannel(channelId: string) {
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

	const updateResult = updateLatestVod(channelId, newestVideo.id, newestVideo.created_at);
	if (updateResult instanceof Error) {
		return updateResult;
	}

	return null;
}

export async function refreshVideosForChannels(channelIds: Array<string>) {
	for (let batchStart = 0; batchStart < channelIds.length; batchStart += BATCH_SIZE) {
		const batch = channelIds.slice(batchStart, batchStart + BATCH_SIZE);

		await Promise.allSettled(batch.map((channelId) => refreshVideosForChannel(channelId)));

		if (batchStart + BATCH_SIZE < channelIds.length) {
			await new Promise((resolve) => setTimeout(resolve, BATCH_DELAY_MS));
		}
	}
}

export function scheduleLiveStateUpdate(
	liveChannelIds: Array<string>,
	logLabel: string,
	shouldRefreshOffline: boolean,
) {
	setTimeout(() => {
		const lastSeenAt = new Date().toISOString();
		const updateResult = updateLiveStates(liveChannelIds, lastSeenAt);
		if (updateResult instanceof Error) {
			console.warn(`[${logLabel}] Failed to update live states:`, updateResult.message);
			return;
		}
		if (shouldRefreshOffline && updateResult.length > 0) {
			refreshVideosForChannels(updateResult).catch((error: unknown) => {
				console.error(`[${logLabel}] Failed to refresh offline channels:`, error);
			});
		}
	}, 0);
}

export function scheduleLatestVodUpdate(channelId: string, vodId: string, vodCreatedAt: string) {
	setTimeout(() => {
		const updateResult = updateLatestVod(channelId, vodId, vodCreatedAt);
		if (updateResult instanceof Error) {
			console.warn("[videos-api] Failed to update latest VOD:", updateResult.message);
		}
	}, 0);
}

export async function populateInitialCache() {
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

export function startBackgroundRefresh() {
	if (refreshIntervalId !== null) {
		clearInterval(refreshIntervalId);
	}

	const refreshTask = async () => {
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
	};

	refreshTask().catch((error: unknown) => {
		console.error("[video-cache] Initial background refresh failed:", error);
	});

	refreshIntervalId = setInterval(() => {
		refreshTask().catch((error: unknown) => {
			console.error("[video-cache] Background refresh failed:", error);
		});
	}, VOD_REFRESH_INTERVAL_MS);

	console.log("[video-cache] Background refresh started");
}

export function stopBackgroundRefresh() {
	if (refreshIntervalId !== null) {
		clearInterval(refreshIntervalId);
		refreshIntervalId = null;
	}

	console.log("[video-cache] Background refresh stopped");
}

export async function refreshLiveStreams() {
	const auth = getAuth();
	if (auth instanceof Error) {
		return auth;
	}

	if (auth.accessToken === null || auth.userId === null) {
		return new Error("Not authenticated");
	}

	return getFollowedStreams(auth.userId);
}
