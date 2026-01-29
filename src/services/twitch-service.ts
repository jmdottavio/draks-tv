import { getAuth, setAuth, clearAuth } from "@/src/features/auth/auth.repository";
import { FORM_HEADERS } from "@/src/shared/utils/http";
import { getTwitchClientId, getTwitchClientSecret } from "@/src/shared/utils/twitch-config";
import {
	TWITCH_HELIX_BASE_URL,
	TWITCH_OAUTH_REVOKE_URL,
	TWITCH_OAUTH_TOKEN_URL,
} from "@/src/shared/utils/twitch-urls";

interface TwitchUser {
	id: string;
	login: string;
	display_name: string;
	profile_image_url: string;
}

interface TwitchStream {
	user_id: string;
	user_login: string;
	user_name: string;
	title: string;
	game_name: string;
	viewer_count: number;
	thumbnail_url: string;
	started_at: string;
}

interface TwitchVideo {
	id: string;
	user_id: string;
	user_name: string;
	title: string;
	duration: string;
	created_at: string;
	thumbnail_url: string;
}

interface TwitchFollowedChannel {
	broadcaster_id: string;
	broadcaster_login: string;
	broadcaster_name: string;
	followed_at: string;
}

interface TwitchResponse<T> {
	data: Array<T>;
	pagination?: {
		cursor?: string;
	};
}

interface TwitchTokenResponse {
	access_token?: string;
	refresh_token?: string;
	expires_in?: number;
}

const REFRESH_BUFFER_SECONDS = 5 * 60; // Refresh 5 minutes before expiry

async function refreshAccessToken() {
	const authResult = getAuth();

	if (authResult instanceof Error) {
		return false;
	}

	if (authResult.refreshToken === null || authResult.userId === null) {
		return false;
	}

	const clientId = getTwitchClientId();
	const clientSecret = getTwitchClientSecret();

	if (clientId === undefined || clientSecret === undefined) {
		return false;
	}

	const response = await fetch(TWITCH_OAUTH_TOKEN_URL, {
		method: "POST",
		headers: FORM_HEADERS,
		body: new URLSearchParams({
			client_id: clientId,
			client_secret: clientSecret,
			grant_type: "refresh_token",
			refresh_token: authResult.refreshToken,
		}),
	});

	if (!response.ok) {
		clearAuth();
		return false;
	}

	const tokenData = (await response.json()) as TwitchTokenResponse;

	if (tokenData.access_token === undefined || tokenData.refresh_token === undefined) {
		clearAuth();
		return false;
	}

	setAuth(
		tokenData.access_token,
		tokenData.refresh_token,
		authResult.userId,
		tokenData.expires_in,
	);
	return true;
}

async function twitchFetch<T>(endpoint: string, isRetry: boolean = false) {
	const clientId = getTwitchClientId();

	if (clientId === undefined) {
		return new Error("Twitch client ID not configured");
	}

	let authResult = getAuth();

	if (authResult instanceof Error) {
		return authResult;
	}

	if (authResult.accessToken === null) {
		return new Error("Not authenticated");
	}

	// Proactive refresh if token expires soon
	if (authResult.expiresAt !== null && !isRetry) {
		const now = Math.floor(Date.now() / 1000);
		if (authResult.expiresAt - now < REFRESH_BUFFER_SECONDS) {
			const wasRefreshed = await refreshAccessToken();
			if (wasRefreshed) {
				// Get fresh auth after refresh
				const freshAuth = getAuth();
				if (!(freshAuth instanceof Error) && freshAuth.accessToken !== null) {
					authResult = freshAuth;
				}
			}
		}
	}

	const response = await fetch(`${TWITCH_HELIX_BASE_URL}${endpoint}`, {
		headers: {
			"Client-ID": clientId,
			Authorization: `Bearer ${authResult.accessToken}`,
		},
	});

	if (response.status === 401 && !isRetry) {
		const wasRefreshed = await refreshAccessToken();

		if (wasRefreshed) {
			return twitchFetch<T>(endpoint, true);
		}

		return new Error("Not authenticated");
	}

	if (!response.ok) {
		return new Error(`Twitch API error: ${response.status}`);
	}

	return response.json() as Promise<TwitchResponse<T>>;
}

async function getUsers(params: { ids?: Array<string>; logins?: Array<string> }) {
	const queryParts: Array<string> = [];

	if (params.ids !== undefined) {
		const idParams = params.ids.map((id) => `id=${id}`);
		queryParts.push(...idParams);
	}

	if (params.logins !== undefined) {
		const loginParams = params.logins.map((login) => `login=${login}`);
		queryParts.push(...loginParams);
	}

	if (queryParts.length === 0) {
		return new Error("Must provide ids or logins");
	}

	const result = await twitchFetch<TwitchUser>(`/users?${queryParts.join("&")}`);

	if (result instanceof Error) {
		return result;
	}

	return result.data;
}

async function getFollowedStreams(userId: string) {
	const result = await twitchFetch<TwitchStream>(`/streams/followed?user_id=${userId}&first=100`);

	if (result instanceof Error) {
		return result;
	}

	return result.data;
}

async function getVideos(userId: string, limit: number = 1) {
	const result = await twitchFetch<TwitchVideo>(
		`/videos?user_id=${userId}&type=archive&first=${limit}`,
	);

	if (result instanceof Error) {
		return result;
	}

	return result.data;
}

async function getFollowedChannels(userId: string) {
	const allChannels: Array<TwitchFollowedChannel> = [];
	let cursor: string | undefined;

	do {
		const endpoint = cursor
			? `/channels/followed?user_id=${userId}&first=100&after=${cursor}`
			: `/channels/followed?user_id=${userId}&first=100`;

		const result = await twitchFetch<TwitchFollowedChannel>(endpoint);

		if (result instanceof Error) {
			return result;
		}

		allChannels.push(...result.data);
		cursor = result.pagination?.cursor;
	} while (cursor !== undefined);

	return allChannels;
}

async function revokeToken(token: string) {
	const clientId = getTwitchClientId();

	if (clientId === undefined) {
		return new Error("Twitch client ID not configured");
	}

	try {
		const response = await fetch(TWITCH_OAUTH_REVOKE_URL, {
			method: "POST",
			headers: FORM_HEADERS,
			body: new URLSearchParams({
				client_id: clientId,
				token,
			}),
		});

		// Twitch returns 200 on success, even if token was already invalid
		if (!response.ok) {
			return new Error(`Token revocation failed: ${response.status}`);
		}
	} catch (error) {
		return new Error(
			`Token revocation request failed: ${error instanceof Error ? error.message : "Unknown error"}`,
		);
	}
}

export { getUsers, getFollowedStreams, getVideos, getFollowedChannels, revokeToken };

export type { TwitchUser, TwitchStream, TwitchVideo };
