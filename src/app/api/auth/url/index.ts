import { createFileRoute } from "@tanstack/react-router";

import { createErrorResponse, ErrorCode } from "@/src/shared/utils/api-errors";

export const Route = createFileRoute("/api/auth/url/")({
	server: {
		handlers: {
			GET: async function handler() {
				const clientId = process.env.TWITCH_CLIENT_ID;

				if (clientId === undefined) {
					return createErrorResponse("TWITCH_CLIENT_ID not configured", ErrorCode.CONFIG_ERROR, 500);
				}

				const redirectUri = "http://localhost:9442/api/auth/callback";
				const scope = "user:read:follows";

				const params = new URLSearchParams({
					client_id: clientId,
					redirect_uri: redirectUri,
					response_type: "code",
					scope,
				});

				const url = `https://id.twitch.tv/oauth2/authorize?${params.toString()}`;

				return Response.json({ url });
			},
		},
	},
});
