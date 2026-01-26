import { createFileRoute } from "@tanstack/react-router";

import { getVideos } from "@/src/services/twitch-service";
import { createErrorResponse, ErrorCode } from "@/src/shared/utils/api-errors";

export const Route = createFileRoute("/api/videos/")({
	server: {
		handlers: {
			GET: async ({ request }) => {
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

				return Response.json(result);
			},
		},
	},
});
