import { createFileRoute } from "@tanstack/react-router";

import { getAuth } from "@/src/features/auth/auth.repository";
import { getAllFollowedChannels } from "@/src/features/channels/followed-channels.repository";
import { getFollowedStreams } from "@/src/services/twitch-service";
import { scheduleLiveStateUpdate } from "@/src/services/video-cache-service";
import { createErrorResponse, ErrorCode } from "@/src/shared/utils/api-errors";

import type { SidebarChannel } from "@/src/features/sidebar/sidebar.types";
import type { TwitchStream } from "@/src/services/twitch-service";

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

				const followedChannelsResult = getAllFollowedChannels();
				const liveStreamsResult = await getFollowedStreams(authResult.userId);

				if (followedChannelsResult instanceof Error) {
					return createErrorResponse(
						followedChannelsResult.message,
						ErrorCode.DATABASE_ERROR,
						500,
					);
				}

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

				scheduleLiveStateUpdate(liveChannelIds, "followed-channels-api", false);

				const channels: Array<SidebarChannel> = [];
				for (const channel of followedChannelsResult) {
					const stream = liveStreamsByChannelId.get(channel.channelId);
					const isLive = stream !== undefined;

					channels.push({
						id: channel.channelId,
						channelName: channel.channelName,
						profileImage: channel.profileImageUrl,
						isLive,
						isFavorite: channel.isFavorite,
						viewerCount: stream?.viewerCount ?? null,
						lastSeenAt: isLive ? null : channel.lastSeenAt,
						gameName: stream?.gameName ?? null,
						streamTitle: stream?.title ?? null,
					});
				}

				channels.sort((a, b) => {
					if (a.isFavorite && !b.isFavorite) return -1;
					if (!a.isFavorite && b.isFavorite) return 1;

					if (a.lastSeenAt !== null && b.lastSeenAt !== null) {
						const diff =
							new Date(b.lastSeenAt).getTime() - new Date(a.lastSeenAt).getTime();
						if (diff !== 0) return diff;
					} else if (a.lastSeenAt !== null && b.lastSeenAt === null) {
						return -1;
					} else if (a.lastSeenAt === null && b.lastSeenAt !== null) {
						return 1;
					}

					return a.channelName.localeCompare(b.channelName);
				});

				return Response.json(channels);
			},
		},
	},
});
