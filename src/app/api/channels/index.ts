import { createFileRoute } from "@tanstack/react-router";

import { getAuth } from "@/src/db/repositories/auth-repository";
import { getAllFavorites } from "@/src/db/repositories/favorites-repository";
import {
	getFollowedStreams,
	getFollowedChannels,
	getVideos,
	getUsers,
} from "@/src/services/twitch-service";
import { createErrorResponse, ErrorCode } from "@/src/shared/utils/api-errors";

import type { TwitchStream, TwitchVideo } from "@/src/services/twitch-service";

interface StreamData {
	title: string;
	gameName: string;
	viewerCount: number;
	thumbnailUrl: string;
	startedAt: string;
}

interface VodData {
	id: string;
	title: string;
	duration: string;
	createdAt: string;
	thumbnailUrl: string;
}

interface ChannelData {
	id: string;
	login: string;
	displayName: string;
	profileImage: string;
	isLive: boolean;
	isFavorite: boolean;
	stream: StreamData | null;
	latestVod: VodData | null;
}

function transformStream(stream: TwitchStream): StreamData {
	return {
		title: stream.title,
		gameName: stream.game_name,
		viewerCount: stream.viewer_count,
		thumbnailUrl: stream.thumbnail_url,
		startedAt: stream.started_at,
	};
}

function transformVod(vod: TwitchVideo): VodData {
	return {
		id: vod.id,
		title: vod.title,
		duration: vod.duration,
		createdAt: vod.created_at,
		thumbnailUrl: vod.thumbnail_url,
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
					return createErrorResponse(favoritesResult.message, ErrorCode.DATABASE_ERROR, 500);
				}

				const streamsResult = await getFollowedStreams(authResult.userId);

				if (streamsResult instanceof Error) {
					return createErrorResponse(streamsResult.message, ErrorCode.TWITCH_API_ERROR, 500);
				}

				const followedResult = await getFollowedChannels(authResult.userId);

				if (followedResult instanceof Error) {
					return createErrorResponse(followedResult.message, ErrorCode.TWITCH_API_ERROR, 500);
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

				const favoriteChannels: Array<ChannelData> = [];

				for (const favorite of favoritesResult) {
					const rawStream = streamsByUserId.get(favorite.id);
					const isLive = rawStream !== undefined;
					const stream = rawStream !== undefined ? transformStream(rawStream) : null;

					let latestVod: VodData | null = null;

					if (!isLive) {
						const vodResult = await getVideos(favorite.id, 1);

						if (!(vodResult instanceof Error) && vodResult.length > 0) {
							const firstVod = vodResult[0];
							if (firstVod !== undefined) {
								latestVod = transformVod(firstVod);
							}
						}
					}

					favoriteChannels.push({
						id: favorite.id,
						login: favorite.login,
						displayName: favorite.displayName,
						profileImage: favorite.profileImage,
						isLive,
						isFavorite: true,
						stream,
						latestVod,
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
