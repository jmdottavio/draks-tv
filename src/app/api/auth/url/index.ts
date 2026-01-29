import { createFileRoute } from "@tanstack/react-router";

import { createStateToken } from "@/src/shared/utils/oauth-state";
import { getClientIp } from "@/src/shared/utils/http";
import { checkAuthRateLimit, createRateLimitResponse } from "@/src/shared/utils/rate-limiter";
import { getAuthRedirectUri } from "@/src/shared/utils/server-config";
import { getTwitchClientId } from "@/src/shared/utils/twitch-config";
import { TWITCH_OAUTH_AUTHORIZE_URL } from "@/src/shared/utils/twitch-urls";
import { createErrorResponse, ErrorCode } from "@/src/shared/utils/api-errors";

export const Route = createFileRoute("/api/auth/url/")({
	server: {
		handlers: {
			GET: async function handler({ request }) {
				const clientIp = getClientIp(request);
				const rateLimit = checkAuthRateLimit(clientIp);
				if (!rateLimit.allowed) {
					return createRateLimitResponse(rateLimit.retryAfterMs);
				}
				const clientId = getTwitchClientId();

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
