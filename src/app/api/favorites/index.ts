import { createFileRoute } from "@tanstack/react-router";

import { addFavorite } from "@/src/db/repositories/favorites-repository";
import { createErrorResponse, ErrorCode } from "@/src/shared/utils/api-errors";
import { parseRequestBody } from "@/src/shared/utils/parse-request-body";
import { validateAddFavoriteRequest } from "@/src/shared/validators/favorites.validators";

export const Route = createFileRoute("/api/favorites/")({
	server: {
		handlers: {
			POST: async ({ request }) => {
				const body = await parseRequestBody(request, validateAddFavoriteRequest);

				if (body instanceof Response) {
					return body;
				}

				const result = addFavorite(body);

				if (result instanceof Error) {
					return createErrorResponse(result.message, ErrorCode.DATABASE_ERROR, 500);
				}

				return Response.json({ success: true }, { status: 201 });
			},
		},
	},
});
