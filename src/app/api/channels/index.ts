import { createFileRoute } from "@tanstack/react-router";

import { getAuth } from "@/src/features/auth/auth.repository";
import { getAllFavorites } from "@/src/features/channels/favorites.repository";
import { getFollowedChannels, getFollowedStreams, getUsers } from "@/src/services/twitch-service";
import {
	getChannelsWithVideos,
	processLiveStateChanges,
	refreshOfflineChannelsBatched,
} from "@/src/services/video-cache-service";
import { createErrorResponse, ErrorCode } from "@/src/shared/utils/api-errors";

import type { CachedVideoSelect } from "@/src/features/vods/vods.types";
import type { TwitchStream } from "@/src/services/twitch-service";

type StreamData = {
	title: string;
	gameName: string;
	viewerCount: number;
	thumbnailUrl: string;
	startedAt: string;
};

type VodData = {
	id: string;
	title: string;
	duration: string;
	createdAt: string;
	thumbnailUrl: string;
};

function transformCachedVod(vod: CachedVideoSelect): VodData {
	return {
		id: vod.videoId,
		title: vod.title,
		duration: vod.duration,
		createdAt: vod.createdAt,
		thumbnailUrl: vod.thumbnailUrl,
	};
}

type ChannelData = {
	id: string;
	login: string;
	displayName: string;
	profileImage: string;
	isLive: boolean;
	isFavorite: boolean;
	stream: StreamData | null;
	latestVod: VodData | null;
};

function transformStream(stream: TwitchStream): StreamData {
	return {
		title: stream.title,
		gameName: stream.game_name,
		viewerCount: stream.viewer_count,
		thumbnailUrl: stream.thumbnail_url,
		startedAt: stream.started_at,
	};
}

export const Route = createFileRoute("/api/channels/")({
	server: {
		handlers: {
			GET: async function handler() {
				const authResult = getAuth();

				if (authResult instanceof Error) {
					return createErrorResponse(authResult.message, ErrorCode.DATABASE_ERROR, 500);
				}

				if (authResult.accessToken === null || authResult.userId === null) {
					return createErrorResponse("Not authenticated", ErrorCode.UNAUTHORIZED, 401);
				}

				const favoritesResult = getAllFavorites();

				if (favoritesResult instanceof Error) {
					return createErrorResponse(
						favoritesResult.message,
						ErrorCode.DATABASE_ERROR,
						500,
					);
				}

				// Parallelize Twitch API calls
				const [streamsResult, followedResult] = await Promise.all([
					getFollowedStreams(authResult.userId),
					getFollowedChannels(authResult.userId),
				]);

				if (streamsResult instanceof Error) {
					return createErrorResponse(
						streamsResult.message,
						ErrorCode.TWITCH_API_ERROR,
						500,
					);
				}

				if (followedResult instanceof Error) {
					return createErrorResponse(
						followedResult.message,
						ErrorCode.TWITCH_API_ERROR,
						500,
					);
				}

				// Process live state changes (detect offline transitions)
				const channelsThatWentOffline = processLiveStateChanges(streamsResult);

				// Refresh videos for channels that just went offline (batched to avoid rate limits)
				if (
					!(channelsThatWentOffline instanceof Error) &&
					channelsThatWentOffline.length > 0
				) {
					// Fire and forget - don't block response for VOD refresh
					refreshOfflineChannelsBatched(channelsThatWentOffline).catch((error) => {
						console.error("[channels-api] Failed to refresh offline channels:", error);
					});
				}

				const favoriteIds = new Set<string>();
				for (const favorite of favoritesResult) {
					favoriteIds.add(favorite.id);
				}

				const streamsByUserId = new Map<string, TwitchStream>();
				for (const stream of streamsResult) {
					streamsByUserId.set(stream.user_id, stream);
				}

				// Fetch profile images for non-favorite channels
				const nonFavoriteUserIds: Array<string> = [];
				for (const channel of followedResult) {
					if (!favoriteIds.has(channel.broadcaster_id)) {
						nonFavoriteUserIds.push(channel.broadcaster_id);
					}
				}

				const profileImages = new Map<string, string>();

				// Twitch API allows max 100 users per request
				for (let i = 0; i < nonFavoriteUserIds.length; i += 100) {
					const batch = nonFavoriteUserIds.slice(i, i + 100);
					const usersResult = await getUsers({ ids: batch });

					if (!(usersResult instanceof Error)) {
						for (const user of usersResult) {
							profileImages.set(user.id, user.profile_image_url);
						}
					}
				}

				// Collect offline favorite IDs for cache lookup
				const offlineFavoriteIds = favoritesResult
					.filter((favorite) => !streamsByUserId.has(favorite.id))
					.map((favorite) => favorite.id);

				// Get cached videos for offline favorites
				const cachedChannels = getChannelsWithVideos(offlineFavoriteIds);

				// Build a map for lookup
				const vodsByChannelId = new Map<string, VodData>();
				if (!(cachedChannels instanceof Error)) {
					for (const cached of cachedChannels) {
						if (cached.latestVideo !== null) {
							vodsByChannelId.set(
								cached.channelId,
								transformCachedVod(cached.latestVideo),
							);
						}
					}
				}

				const favoriteChannels: Array<ChannelData> = [];

				for (const favorite of favoritesResult) {
					const rawStream = streamsByUserId.get(favorite.id);
					const isLive = rawStream !== undefined;
					const stream = rawStream !== undefined ? transformStream(rawStream) : null;

					favoriteChannels.push({
						id: favorite.id,
						login: favorite.login,
						displayName: favorite.displayName,
						profileImage: favorite.profileImage,
						isLive,
						isFavorite: true,
						stream,
						latestVod: vodsByChannelId.get(favorite.id) ?? null,
					});
				}

				const nonFavoriteChannels: Array<ChannelData> = [];

				for (const channel of followedResult) {
					if (favoriteIds.has(channel.broadcaster_id)) {
						continue;
					}

					const rawStream = streamsByUserId.get(channel.broadcaster_id);
					const isLive = rawStream !== undefined;
					const stream = rawStream !== undefined ? transformStream(rawStream) : null;

					nonFavoriteChannels.push({
						id: channel.broadcaster_id,
						login: channel.broadcaster_login,
						displayName: channel.broadcaster_name,
						profileImage: profileImages.get(channel.broadcaster_id) ?? "",
						isLive,
						isFavorite: false,
						stream,
						latestVod: null,
					});
				}

				const allChannels = [...favoriteChannels, ...nonFavoriteChannels];

				return Response.json(allChannels);
			},
		},
	},
});
