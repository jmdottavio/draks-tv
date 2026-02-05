import { createFileRoute } from "@tanstack/react-router";

import { getAuth } from "@/src/features/auth/auth.repository";
import {
	getAllFollowedChannels,
	getLatestVodsByChannelIds,
} from "@/src/features/channels/followed-channels.repository";
import { getFollowedStreams } from "@/src/services/twitch-service";
import { scheduleLiveStateUpdate } from "@/src/services/video-cache-service";
import { createErrorResponse, ErrorCode } from "@/src/shared/utils/api-errors";

import type { Channel, Stream } from "@/src/features/channels/channels.types";
import type { VodSummary } from "@/src/features/vods/vods.types";
import type { TwitchStream } from "@/src/services/twitch-service";

function transformStream(stream: TwitchStream): Stream {
	return {
		title: stream.title,
		gameName: stream.gameName,
		viewerCount: stream.viewerCount,
		thumbnailUrl: stream.thumbnailUrl,
		startedAt: stream.startedAt,
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

				const followedChannelsResult = getAllFollowedChannels();

				if (followedChannelsResult instanceof Error) {
					return createErrorResponse(
						followedChannelsResult.message,
						ErrorCode.DATABASE_ERROR,
						500,
					);
				}

				const liveStreamsResult = await getFollowedStreams(authResult.userId);

				if (liveStreamsResult instanceof Error) {
					return createErrorResponse(
						liveStreamsResult.message,
						ErrorCode.TWITCH_API_ERROR,
						500,
					);
				}

				const liveStreamsByChannelId = new Map<string, TwitchStream>();
				const liveChannelIds: Array<string> = [];
				for (const stream of liveStreamsResult) {
					liveStreamsByChannelId.set(stream.userId, stream);
					liveChannelIds.push(stream.userId);
				}

				scheduleLiveStateUpdate(liveChannelIds, "channels-api", true);

				const offlineFavoriteIds: Array<string> = [];
				for (const channel of followedChannelsResult) {
					if (channel.isFavorite && !liveStreamsByChannelId.has(channel.channelId)) {
						offlineFavoriteIds.push(channel.channelId);
					}
				}

				const cachedChannels = getLatestVodsByChannelIds(offlineFavoriteIds);
				if (cachedChannels instanceof Error) {
					return createErrorResponse(
						cachedChannels.message,
						ErrorCode.DATABASE_ERROR,
						500,
					);
				}
				const vodsByChannelId = new Map<string, VodSummary>();
				for (const cached of cachedChannels) {
					if (cached.latestVod !== null) {
						vodsByChannelId.set(cached.channelId, {
							id: cached.latestVod.id,
							title: cached.latestVod.title,
							durationSeconds: cached.latestVod.durationSeconds,
							createdAt: cached.latestVod.createdAt,
							thumbnailUrl: cached.latestVod.thumbnailUrl,
						});
					}
				}

				const favoriteChannels: Array<Channel> = [];
				const liveNonFavoriteChannels: Array<Channel> = [];

				for (const channel of followedChannelsResult) {
					const rawStream = liveStreamsByChannelId.get(channel.channelId);
					const isLive = rawStream !== undefined;
					const stream = rawStream !== undefined ? transformStream(rawStream) : null;

					if (channel.isFavorite) {
						favoriteChannels.push({
							id: channel.channelId,
							channelName: channel.channelName,
							profileImage: channel.profileImageUrl,
							isLive,
							isFavorite: true,
							stream,
							latestVod: vodsByChannelId.get(channel.channelId) ?? null,
						});
						continue;
					}

					if (isLive) {
						liveNonFavoriteChannels.push({
							id: channel.channelId,
							channelName: channel.channelName,
							profileImage: channel.profileImageUrl,
							isLive,
							isFavorite: false,
							stream,
							latestVod: null,
						});
					}
				}

				const allChannels = [...favoriteChannels, ...liveNonFavoriteChannels];
				return Response.json(allChannels);
			},
		},
	},
});
