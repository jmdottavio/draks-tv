import { createFileRoute } from "@tanstack/react-router";

import { getAuth } from "@/src/features/auth/auth.repository";
import { getAllFavorites } from "@/src/features/channels/favorites.repository";
import { getAllLastSeenDates } from "@/src/features/sidebar/channel-last-seen.repository";
import { getFollowedStreams, getFollowedChannels, getUsers } from "@/src/services/twitch-service";
import { createErrorResponse, ErrorCode } from "@/src/shared/utils/api-errors";

import type { TwitchStream } from "@/src/services/twitch-service";

interface SidebarChannelData {
	id: string;
	login: string;
	displayName: string;
	profileImage: string;
	isLive: boolean;
	isFavorite: boolean;
	viewerCount: number | null;
	lastVodDate: string | null;
	gameName: string | null;
}

export const Route = createFileRoute("/api/channels/followed/")({
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

				const followedResult = await getFollowedChannels(authResult.userId);

				if (followedResult instanceof Error) {
					return createErrorResponse(
						followedResult.message,
						ErrorCode.TWITCH_API_ERROR,
						500,
					);
				}

				const streamsResult = await getFollowedStreams(authResult.userId);

				if (streamsResult instanceof Error) {
					return createErrorResponse(
						streamsResult.message,
						ErrorCode.TWITCH_API_ERROR,
						500,
					);
				}

				const favoritesResult = getAllFavorites();

				if (favoritesResult instanceof Error) {
					return createErrorResponse(
						favoritesResult.message,
						ErrorCode.DATABASE_ERROR,
						500,
					);
				}

				const lastSeenDates = getAllLastSeenDates();
				const lastSeenMap =
					lastSeenDates instanceof Error ? new Map<string, string>() : lastSeenDates;

				// Fetch profile images for all followed channels
				const userIds = followedResult.map((channel) => channel.broadcaster_id);
				const profileImages = new Map<string, string>();

				// Twitch API allows max 100 users per request
				for (let i = 0; i < userIds.length; i += 100) {
					const batch = userIds.slice(i, i + 100);
					const usersResult = await getUsers({ ids: batch });

					if (!(usersResult instanceof Error)) {
						for (const user of usersResult) {
							profileImages.set(user.id, user.profile_image_url);
						}
					}
				}

				const streamsByUserId = new Map<string, TwitchStream>();
				for (const stream of streamsResult) {
					streamsByUserId.set(stream.user_id, stream);
				}

				const favoriteIds = new Set<string>();
				for (const favorite of favoritesResult) {
					favoriteIds.add(favorite.id);
				}

				const channels: Array<SidebarChannelData> = [];

				for (const channel of followedResult) {
					const stream = streamsByUserId.get(channel.broadcaster_id);
					const isLive = stream !== undefined;

					channels.push({
						id: channel.broadcaster_id,
						login: channel.broadcaster_login,
						displayName: channel.broadcaster_name,
						profileImage: profileImages.get(channel.broadcaster_id) ?? "",
						isLive,
						isFavorite: favoriteIds.has(channel.broadcaster_id),
						viewerCount: stream?.viewer_count ?? null,
						lastVodDate: isLive
							? null
							: (lastSeenMap.get(channel.broadcaster_id) ?? null),
						gameName: stream?.game_name ?? null,
					});
				}

				return Response.json(channels);
			},
		},
	},
});
