import { createFileRoute } from "@tanstack/react-router";

import {
	isFavorite,
	addFavorite,
	removeFavorite,
} from "@/src/db/repositories/favorites-repository";
import { getUsers } from "@/src/services/twitch-service";
import { createErrorResponse, ErrorCode } from "@/src/shared/utils/api-errors";

export const Route = createFileRoute("/api/favorites/toggle/$id/")({
	server: {
		handlers: {
			POST: async ({ params }) => {
				const { id } = params;

				const favoriteStatus = isFavorite(id);

				if (favoriteStatus instanceof Error) {
					return createErrorResponse(favoriteStatus.message, ErrorCode.DATABASE_ERROR, 500);
				}

				if (favoriteStatus) {
					const removeResult = removeFavorite(id);

					if (removeResult instanceof Error) {
						return createErrorResponse(removeResult.message, ErrorCode.DATABASE_ERROR, 500);
					}

					return Response.json({ isFavorite: false });
				}

				const usersResult = await getUsers({ ids: [id] });

				if (usersResult instanceof Error) {
					return createErrorResponse(usersResult.message, ErrorCode.TWITCH_API_ERROR, 500);
				}

				if (usersResult.length === 0) {
					return createErrorResponse("User not found", ErrorCode.NOT_FOUND, 404);
				}

				const user = usersResult[0];

				if (user === undefined) {
					return createErrorResponse("User not found", ErrorCode.NOT_FOUND, 404);
				}

				const addResult = addFavorite({
					id: user.id,
					login: user.login,
					displayName: user.display_name,
					profileImage: user.profile_image_url,
				});

				if (addResult instanceof Error) {
					return createErrorResponse(addResult.message, ErrorCode.DATABASE_ERROR, 500);
				}

				return Response.json({ isFavorite: true });
			},
		},
	},
});
