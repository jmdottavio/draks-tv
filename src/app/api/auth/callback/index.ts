import { createFileRoute, redirect } from "@tanstack/react-router";

import { setAuth } from "@/src/features/auth/auth.repository";
import { createErrorResponse, ErrorCode } from "@/src/shared/utils/api-errors";

interface TwitchTokenResponse {
	access_token: string;
	refresh_token: string;
	expires_in: number;
	scope: Array<string>;
	token_type: string;
}

interface TwitchUserResponse {
	data: Array<{
		id: string;
		login: string;
		display_name: string;
		profile_image_url: string;
	}>;
}

export const Route = createFileRoute("/api/auth/callback/")({
	server: {
		handlers: {
			GET: async function handler({ request }) {
				const url = new URL(request.url);
				const code = url.searchParams.get("code");

				if (code === null) {
					return createErrorResponse(
						"Missing authorization code",
						ErrorCode.INVALID_INPUT,
						400,
					);
				}

				const clientId = process.env.TWITCH_CLIENT_ID;
				const clientSecret = process.env.TWITCH_CLIENT_SECRET;

				if (clientId === undefined || clientSecret === undefined) {
					return createErrorResponse(
						"Twitch credentials not configured",
						ErrorCode.CONFIG_ERROR,
						500,
					);
				}

				const tokenResponse = await fetch("https://id.twitch.tv/oauth2/token", {
					method: "POST",
					headers: {
						"Content-Type": "application/x-www-form-urlencoded",
					},
					body: new URLSearchParams({
						client_id: clientId,
						client_secret: clientSecret,
						code,
						grant_type: "authorization_code",
						redirect_uri: "http://localhost:9442/api/auth/callback",
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

				const userResponse = await fetch("https://api.twitch.tv/helix/users", {
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
