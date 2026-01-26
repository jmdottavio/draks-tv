import { createFileRoute } from "@tanstack/react-router";

import { createStateToken } from "@/src/shared/utils/oauth-state";
import { checkAuthRateLimit } from "@/src/shared/utils/rate-limiter";
import { getAuthRedirectUri } from "@/src/shared/utils/server-config";
import { TWITCH_OAUTH_AUTHORIZE_URL } from "@/src/shared/utils/twitch-urls";
import { createErrorResponse, ErrorCode } from "@/src/shared/utils/api-errors";

function getClientIp(request: Request): string {
	const forwarded = request.headers.get("x-forwarded-for");
	if (forwarded !== null) {
		const firstIp = forwarded.split(",")[0];
		if (firstIp !== undefined) {
			return firstIp.trim();
		}
	}
	return "unknown";
}

export const Route = createFileRoute("/api/auth/url/")({
	server: {
		handlers: {
			GET: async function handler({ request }) {
				const clientIp = getClientIp(request);
				const rateLimit = checkAuthRateLimit(clientIp);
				if (!rateLimit.allowed) {
					return new Response(JSON.stringify({ error: "Too many requests" }), {
						status: 429,
						headers: {
							"Content-Type": "application/json",
							"Retry-After": String(Math.ceil((rateLimit.retryAfterMs ?? 60000) / 1000)),
						},
					});
				}
				const clientId = process.env.TWITCH_CLIENT_ID;

				if (clientId === undefined) {
					return createErrorResponse(
						"TWITCH_CLIENT_ID not configured",
						ErrorCode.CONFIG_ERROR,
						500,
					);
				}

				const scope = "user:read:follows";
				const state = createStateToken();

				const params = new URLSearchParams({
					client_id: clientId,
					redirect_uri: getAuthRedirectUri(),
					response_type: "code",
					scope,
					state,
				});

				const url = `${TWITCH_OAUTH_AUTHORIZE_URL}?${params.toString()}`;

				return Response.json({ url, state });
			},
		},
	},
});
