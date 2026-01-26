import { createFileRoute } from "@tanstack/react-router";

import { getUsers } from "@/src/services/twitch-service";
import { createErrorResponse, ErrorCode } from "@/src/shared/utils/api-errors";
import { requireAuth } from "@/src/shared/utils/require-auth";

export const Route = createFileRoute("/api/users/")({
	server: {
		handlers: {
			GET: async ({ request }) => {
				const auth = requireAuth();
				if (!auth.authenticated) {
					return auth.response;
				}

				const url = new URL(request.url);
				const loginsParam = url.searchParams.get("logins");

				if (loginsParam === null) {
					return createErrorResponse(
						"logins query param required",
						ErrorCode.INVALID_INPUT,
						400,
					);
				}

				const logins = loginsParam.split(",").filter((login) => login.length > 0);

				if (logins.length === 0) {
					return createErrorResponse(
						"logins cannot be empty",
						ErrorCode.INVALID_INPUT,
						400,
					);
				}

				const result = await getUsers({ logins });

				if (result instanceof Error) {
					return createErrorResponse(result.message, ErrorCode.TWITCH_API_ERROR, 500);
				}

				return Response.json(result);
			},
		},
	},
});
