import { createFileRoute } from "@tanstack/react-router";

import { getAuthRedirectUri } from "@/src/shared/utils/server-config";
import { TWITCH_OAUTH_AUTHORIZE_URL } from "@/src/shared/utils/twitch-urls";
import { createErrorResponse, ErrorCode } from "@/src/shared/utils/api-errors";

export const Route = createFileRoute("/api/auth/url/")({
	server: {
		handlers: {
			GET: async function handler() {
				const clientId = process.env.TWITCH_CLIENT_ID;

				if (clientId === undefined) {
					return createErrorResponse(
						"TWITCH_CLIENT_ID not configured",
						ErrorCode.CONFIG_ERROR,
						500,
					);
				}

				const scope = "user:read:follows";

				const params = new URLSearchParams({
					client_id: clientId,
					redirect_uri: getAuthRedirectUri(),
					response_type: "code",
					scope,
				});

				const url = `${TWITCH_OAUTH_AUTHORIZE_URL}?${params.toString()}`;

				return Response.json({ url });
			},
		},
	},
});
