import { createFileRoute } from "@tanstack/react-router";

import { clearAuth, getAuth } from "@/src/features/auth/auth.repository";
import { getClientIp } from "@/src/shared/utils/http";
import { checkAuthRateLimit, createRateLimitResponse } from "@/src/shared/utils/rate-limiter";
import { revokeToken } from "@/src/services/twitch-service";
import { createErrorResponse, ErrorCode } from "@/src/shared/utils/api-errors";

export const Route = createFileRoute("/api/auth/logout/")({
	server: {
		handlers: {
			POST: async function handler({ request }) {
				const clientIp = getClientIp(request);
				const rateLimit = checkAuthRateLimit(clientIp);
				if (!rateLimit.allowed) {
					return createRateLimitResponse(rateLimit.retryAfterMs);
				}

				const authResult = getAuth();

				// Try to revoke token with Twitch (best effort)
				if (!(authResult instanceof Error) && authResult.accessToken !== null) {
					const revokeResult = await revokeToken(authResult.accessToken);
					if (revokeResult instanceof Error) {
						console.warn("Token revocation failed:", revokeResult.message);
					}
				}

				// Always clear local tokens
				const result = clearAuth();

				if (result instanceof Error) {
					return createErrorResponse(result.message, ErrorCode.DATABASE_ERROR, 500);
				}

				return Response.json({ success: true });
			},
		},
	},
});
