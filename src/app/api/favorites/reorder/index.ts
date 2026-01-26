import { createFileRoute } from "@tanstack/react-router";

import { reorderFavorites } from "@/src/features/channels/favorites.repository";
import { createErrorResponse, ErrorCode } from "@/src/shared/utils/api-errors";
import { parseRequestBody } from "@/src/shared/utils/parse-request-body";
import { validateReorderFavoritesRequest } from "@/src/features/channels/channels.validators";
import { requireAuth } from "@/src/shared/utils/require-auth";

export const Route = createFileRoute("/api/favorites/reorder/")({
	server: {
		handlers: {
			PUT: async ({ request }) => {
				const auth = requireAuth();
				if (!auth.authenticated) {
					return auth.response;
				}

				const body = await parseRequestBody(request, validateReorderFavoritesRequest);

				if (body instanceof Response) {
					return body;
				}

				const result = reorderFavorites(body.orderedIds);

				if (result instanceof Error) {
					return createErrorResponse(result.message, ErrorCode.DATABASE_ERROR, 500);
				}

				return Response.json({ success: true });
			},
		},
	},
});
