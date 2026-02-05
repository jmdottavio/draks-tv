import { createFileRoute } from "@tanstack/react-router";

import { getUsers, getVideos } from "@/src/services/twitch-service";
import { createErrorResponse, ErrorCode } from "@/src/shared/utils/api-errors";
import { requireAuth } from "@/src/shared/utils/require-auth";

export const Route = createFileRoute("/api/channels/search/")({
	server: {
		handlers: {
			GET: async ({ request }) => {
				const auth = requireAuth();
				if (!auth.authenticated) {
					return auth.response;
				}

				const url = new URL(request.url);
				const channelName = url.searchParams.get("channelName");
				const limitParam = url.searchParams.get("limit");

				if (channelName === null || channelName.trim() === "") {
					return createErrorResponse(
						"channelName query param required",
						ErrorCode.INVALID_INPUT,
						400,
					);
				}

				const limit = limitParam !== null ? parseInt(limitParam, 10) : 10;

				if (isNaN(limit) || limit < 1) {
					return createErrorResponse(
						"limit must be a positive number",
						ErrorCode.INVALID_INPUT,
						400,
					);
				}

				const channelsResult = await getUsers({ logins: [channelName] });
				if (channelsResult instanceof Error) {
					return createErrorResponse(
						channelsResult.message,
						ErrorCode.TWITCH_API_ERROR,
						500,
					);
				}

				const channel = channelsResult[0];
				if (channel === undefined) {
					return createErrorResponse(
						`Channel "${channelName}" not found`,
						ErrorCode.NOT_FOUND,
						404,
					);
				}

				const videosResult = await getVideos(channel.id, limit);
				if (videosResult instanceof Error) {
					return createErrorResponse(
						videosResult.message,
						ErrorCode.TWITCH_API_ERROR,
						500,
					);
				}

				return Response.json({ channel, videos: videosResult });
			},
		},
	},
});
