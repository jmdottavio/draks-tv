import { createFileRoute, redirect } from "@tanstack/react-router";

import { setAuth } from "@/src/features/auth/auth.repository";
import { validateStateToken } from "@/src/shared/utils/oauth-state";
import { FORM_HEADERS, getClientIp } from "@/src/shared/utils/http";
import { checkAuthRateLimit, createRateLimitResponse } from "@/src/shared/utils/rate-limiter";
import { getAuthRedirectUri } from "@/src/shared/utils/server-config";
import { getTwitchClientId, getTwitchClientSecret } from "@/src/shared/utils/twitch-config";
import { TWITCH_HELIX_BASE_URL, TWITCH_OAUTH_TOKEN_URL } from "@/src/shared/utils/twitch-urls";
import { createErrorResponse, ErrorCode } from "@/src/shared/utils/api-errors";

type TwitchTokenResponse = {
	access_token: string;
	refresh_token: string;
	expires_in: number;
	scope: Array<string>;
	token_type: string;
};

type TwitchUserResponse = {
	data: Array<{
		id: string;
		login: string;
		display_name: string;
		profile_image_url: string;
	}>;
};

export const Route = createFileRoute("/api/auth/callback/")({
	server: {
		handlers: {
			GET: async function handler({ request }) {
				const clientIp = getClientIp(request);
				const rateLimit = checkAuthRateLimit(clientIp);
				if (!rateLimit.allowed) {
					return createRateLimitResponse(rateLimit.retryAfterMs);
				}

				const url = new URL(request.url);

				// Check for OAuth error response
				const error = url.searchParams.get("error");
				if (error !== null) {
					return createErrorResponse(
						`OAuth error: ${error}`,
						ErrorCode.INVALID_INPUT,
						400,
					);
				}

				// Validate state parameter
				const state = url.searchParams.get("state");
				if (state === null) {
					return createErrorResponse(
						"Missing state parameter",
						ErrorCode.INVALID_INPUT,
						400,
					);
				}

				if (!validateStateToken(state)) {
					return createErrorResponse(
						"Invalid or expired state parameter",
						ErrorCode.INVALID_INPUT,
						400,
					);
				}

				const code = url.searchParams.get("code");

				if (code === null) {
					return createErrorResponse(
						"Missing authorization code",
						ErrorCode.INVALID_INPUT,
						400,
					);
				}

				const clientId = getTwitchClientId();
				const clientSecret = getTwitchClientSecret();

				if (clientId === undefined || clientSecret === undefined) {
					return createErrorResponse(
						"Twitch credentials not configured",
						ErrorCode.CONFIG_ERROR,
						500,
					);
				}

				const tokenResponse = await fetch(TWITCH_OAUTH_TOKEN_URL, {
					method: "POST",
					headers: FORM_HEADERS,
					body: new URLSearchParams({
						client_id: clientId,
						client_secret: clientSecret,
						code,
						grant_type: "authorization_code",
						redirect_uri: getAuthRedirectUri(),
					}),
				});

				if (!tokenResponse.ok) {
					return createErrorResponse(
						"Failed to exchange code for tokens",
						ErrorCode.TWITCH_API_ERROR,
						500,
					);
				}

				const tokenData = (await tokenResponse.json()) as TwitchTokenResponse;

				const userResponse = await fetch(`${TWITCH_HELIX_BASE_URL}/users`, {
					headers: {
						Authorization: `Bearer ${tokenData.access_token}`,
						"Client-Id": clientId,
					},
				});

				if (!userResponse.ok) {
					return createErrorResponse(
						"Failed to fetch user info",
						ErrorCode.TWITCH_API_ERROR,
						500,
					);
				}

				const userData = (await userResponse.json()) as TwitchUserResponse;
				const user = userData.data[0];

				if (user === undefined) {
					return createErrorResponse(
						"No user data returned",
						ErrorCode.TWITCH_API_ERROR,
						500,
					);
				}

				const setAuthResult = setAuth(
					tokenData.access_token,
					tokenData.refresh_token,
					user.id,
					tokenData.expires_in,
				);

				if (setAuthResult instanceof Error) {
					return createErrorResponse(
						setAuthResult.message,
						ErrorCode.DATABASE_ERROR,
						500,
					);
				}

				throw redirect({ to: "/" });
			},
		},
	},
});
