import { getAuth, setAuth, clearAuth } from "../database/auth";

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

async function refreshAccessToken(): Promise<boolean> {
	const auth = getAuth();

	if (auth.refreshToken === null || auth.userId === null) {
		return false;
	}

	const response = await fetch("https://id.twitch.tv/oauth2/token", {
		method: "POST",
		headers: { "Content-Type": "application/x-www-form-urlencoded" },
		body: new URLSearchParams({
			client_id: TWITCH_CLIENT_ID,
			client_secret: TWITCH_CLIENT_SECRET,
			grant_type: "refresh_token",
			refresh_token: auth.refreshToken,
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

	setAuth(tokenData.access_token, tokenData.refresh_token, auth.userId);
	return true;
}

async function twitchFetch<T>(
	endpoint: string,
	isRetry: boolean = false,
): Promise<TwitchResponse<T> | Error> {
	const auth = getAuth();

	if (auth.accessToken === null) {
		return new Error("Not authenticated");
	}

	const response = await fetch(`https://api.twitch.tv/helix${endpoint}`, {
		headers: {
			"Client-ID": TWITCH_CLIENT_ID,
			Authorization: `Bearer ${auth.accessToken}`,
		},
	});

	if (response.status === 401 && !isRetry) {
		const refreshed = await refreshAccessToken();
		if (refreshed) {
			return twitchFetch<T>(endpoint, true);
		}
		return new Error("Not authenticated");
	}

	if (!response.ok) {
		return new Error(`Twitch API error: ${response.status}`);
	}

	return response.json();
}

async function getUsers(params: {
	ids?: Array<string>;
	logins?: Array<string>;
}): Promise<Array<TwitchUser> | Error> {
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

async function getFollowedStreams(userId: string): Promise<Array<TwitchStream> | Error> {
	const result = await twitchFetch<TwitchStream>(`/streams/followed?user_id=${userId}&first=100`);

	if (result instanceof Error) {
		return result;
	}

	return result.data;
}

async function getStreamsByUserIds(userIds: Array<string>): Promise<Array<TwitchStream> | Error> {
	if (userIds.length === 0) {
		return [];
	}

	const query = userIds.map((id) => `user_id=${id}`).join("&");
	const result = await twitchFetch<TwitchStream>(`/streams?${query}`);

	if (result instanceof Error) {
		return result;
	}

	return result.data;
}

async function getVideos(userId: string, limit: number = 1): Promise<Array<TwitchVideo> | Error> {
	const result = await twitchFetch<TwitchVideo>(
		`/videos?user_id=${userId}&type=archive&first=${limit}`,
	);

	if (result instanceof Error) {
		return result;
	}

	return result.data;
}

async function getFollowedChannels(userId: string): Promise<Array<TwitchFollowedChannel> | Error> {
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

export {
	twitchFetch,
	getUsers,
	getFollowedStreams,
	getStreamsByUserIds,
	getVideos,
	getFollowedChannels,
};

export type { TwitchUser, TwitchStream, TwitchVideo, TwitchFollowedChannel };
