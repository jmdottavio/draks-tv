import { getAuth, setAuth, clearAuth } from "@/src/db/repositories/auth-repository";

const TWITCH_CLIENT_ID = process.env.TWITCH_CLIENT_ID ?? "";
const TWITCH_CLIENT_SECRET = process.env.TWITCH_CLIENT_SECRET ?? "";

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
}

async function refreshAccessToken() {
	const authResult = getAuth();

	if (authResult instanceof Error) {
		return false;
	}

	if (authResult.refreshToken === null || authResult.userId === null) {
		return false;
	}

	const response = await fetch("https://id.twitch.tv/oauth2/token", {
		method: "POST",
		headers: { "Content-Type": "application/x-www-form-urlencoded" },
		body: new URLSearchParams({
			client_id: TWITCH_CLIENT_ID,
			client_secret: TWITCH_CLIENT_SECRET,
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

	setAuth(tokenData.access_token, tokenData.refresh_token, authResult.userId);
	return true;
}

async function twitchFetch<T>(endpoint: string, isRetry: boolean = false) {
	const authResult = getAuth();

	if (authResult instanceof Error) {
		return authResult;
	}

	if (authResult.accessToken === null) {
		return new Error("Not authenticated");
	}

	const response = await fetch(`https://api.twitch.tv/helix${endpoint}`, {
		headers: {
			"Client-ID": TWITCH_CLIENT_ID,
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

export { getUsers, getFollowedStreams, getVideos, getFollowedChannels };

export type { TwitchUser, TwitchStream, TwitchVideo };
