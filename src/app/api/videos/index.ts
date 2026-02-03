import { createFileRoute } from "@tanstack/react-router";

import { getFollowedChannelIdentity, updateLatestVod } from "@/src/features/channels/followed-channels.repository";
import { upsertVodsFromTwitch } from "@/src/features/vods/vods.repository";
import { getVideos } from "@/src/services/twitch-service";
import { createErrorResponse, ErrorCode } from "@/src/shared/utils/api-errors";
import { requireAuth } from "@/src/shared/utils/require-auth";

export const Route = createFileRoute("/api/videos/")({
	server: {
		handlers: {
			GET: async ({ request }) => {
				const auth = requireAuth();
				if (!auth.authenticated) {
					return auth.response;
				}

				const url = new URL(request.url);
				const userId = url.searchParams.get("userId");
				const limitParam = url.searchParams.get("limit");

				if (userId === null) {
					return createErrorResponse(
						"userId query param required",
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

				const result = await getVideos(userId, limit);

				if (result instanceof Error) {
					return createErrorResponse(result.message, ErrorCode.TWITCH_API_ERROR, 500);
				}

				const upsertResult = upsertVodsFromTwitch(result);
				if (upsertResult instanceof Error) {
					return createErrorResponse(upsertResult.message, ErrorCode.DATABASE_ERROR, 500);
				}

				const newestVideo = result[0];
				if (newestVideo !== undefined) {
					const channelIdentity = getFollowedChannelIdentity(userId);
					if (!(channelIdentity instanceof Error) && channelIdentity !== null) {
						updateLatestVod(userId, newestVideo.id, newestVideo.created_at);
					}
				}

				return Response.json(result);
			},
		},
	},
});
