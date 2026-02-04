import { createFileRoute } from "@tanstack/react-router";

import {
	addFavorite,
	getFollowedChannelIdentity,
	isFavorite,
	removeFavorite,
} from "@/src/features/channels/followed-channels.repository";
import { createErrorResponse, ErrorCode } from "@/src/shared/utils/api-errors";
import { requireAuth } from "@/src/shared/utils/require-auth";

export const Route = createFileRoute("/api/favorites/toggle/$id/")({
	server: {
		handlers: {
			POST: async ({ params }) => {
				const auth = requireAuth();
				if (!auth.authenticated) {
					return auth.response;
				}

				const { id } = params;

				const favoriteStatus = isFavorite(id);

				if (favoriteStatus instanceof Error) {
					return createErrorResponse(
						favoriteStatus.message,
						ErrorCode.DATABASE_ERROR,
						500,
					);
				}

				if (favoriteStatus) {
					const removeResult = removeFavorite(id);

					if (removeResult instanceof Error) {
						return createErrorResponse(
							removeResult.message,
							ErrorCode.DATABASE_ERROR,
							500,
						);
					}

					return Response.json({ isFavorite: false });
				}

				const channelIdentity = getFollowedChannelIdentity(id);

				if (channelIdentity instanceof Error) {
					return createErrorResponse(
						channelIdentity.message,
						ErrorCode.DATABASE_ERROR,
						500,
					);
				}

				if (channelIdentity === null) {
					return createErrorResponse("Channel not found", ErrorCode.NOT_FOUND, 404);
				}

				const addResult = addFavorite({
					id: channelIdentity.channelId,
				});

				if (addResult instanceof Error) {
					return createErrorResponse(addResult.message, ErrorCode.DATABASE_ERROR, 500);
				}

				return Response.json({ isFavorite: true });
			},
		},
	},
});
