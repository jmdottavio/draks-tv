import { extractApiErrorMessage } from "@/src/shared/utils/api-errors";

interface AuthStatus {
	authenticated: boolean;
	userId: string | null;
}

interface AuthUrl {
	url: string;
}

interface Stream {
	title: string;
	gameName: string;
	viewerCount: number;
	thumbnailUrl: string;
	startedAt: string;
}

interface Vod {
	id: string;
	title: string;
	duration: string;
	createdAt: string;
	thumbnailUrl: string;
}

interface Channel {
	id: string;
	login: string;
	displayName: string;
	profileImage: string;
	isFavorite: boolean;
	isLive: boolean;
	stream: Stream | null;
	latestVod: Vod | null;
}

interface TwitchUser {
	id: string;
	login: string;
	display_name: string;
	profile_image_url: string;
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

interface SidebarChannel {
	id: string;
	login: string;
	displayName: string;
	profileImage: string;
	isLive: boolean;
	isFavorite: boolean;
	viewerCount: number | null;
	lastVodDate: string | null;
	gameName: string | null;
}

async function fetchAuthStatus(): Promise<AuthStatus> {
	const response = await fetch("/api/auth/status");
	return response.json();
}

async function fetchAuthUrl(): Promise<string> {
	const response = await fetch("/api/auth/url");
	const data: AuthUrl = await response.json();
	return data.url;
}

async function fetchChannels(): Promise<Array<Channel>> {
	const response = await fetch("/api/channels");

	if (!response.ok) {
		const message = await extractApiErrorMessage(response, "Failed to fetch channels");
		throw new Error(message);
	}

	return response.json();
}

async function toggleFavorite(id: string): Promise<{ isFavorite: boolean }> {
	const response = await fetch(`/api/favorites/toggle/${id}`, { method: "POST" });
	return response.json();
}

async function addFavorite(login: string): Promise<void> {
	const response = await fetch("/api/favorites", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ login }),
	});

	if (!response.ok) {
		const message = await extractApiErrorMessage(response, "Failed to add favorite");
		throw new Error(message);
	}
}

async function fetchUserByLogin(login: string): Promise<TwitchUser | null> {
	const response = await fetch(`/api/users?login=${encodeURIComponent(login)}`);
	const data: { data: Array<TwitchUser> } = await response.json();

	const user = data.data[0];

	if (user === undefined) {
		return null;
	}

	return user;
}

async function fetchVideos(userId: string): Promise<Array<TwitchVideo>> {
	const response = await fetch(`/api/videos?user_id=${userId}`);
	const data: { data: Array<TwitchVideo> } = await response.json();
	return data.data;
}

async function watchLive(channel: string): Promise<void> {
	const response = await fetch(`/api/watch/live/${channel}`, { method: "POST" });

	if (!response.ok) {
		const message = await extractApiErrorMessage(response, "Failed to launch stream");
		throw new Error(message);
	}
}

async function watchVod(id: string): Promise<void> {
	const response = await fetch(`/api/watch/vod/${id}`, { method: "POST" });

	if (!response.ok) {
		const message = await extractApiErrorMessage(response, "Failed to launch VOD");
		throw new Error(message);
	}
}

async function fetchFollowedChannels(): Promise<Array<SidebarChannel>> {
	const response = await fetch("/api/channels/followed");

	if (!response.ok) {
		const message = await extractApiErrorMessage(response, "Failed to fetch followed channels");
		throw new Error(message);
	}

	return response.json();
}

async function reorderFavorites(orderedIds: Array<string>): Promise<void> {
	const response = await fetch("/api/favorites/reorder", {
		method: "PUT",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ orderedIds }),
	});

	if (!response.ok) {
		const message = await extractApiErrorMessage(response, "Failed to reorder favorites");
		throw new Error(message);
	}
}

export {
	fetchAuthStatus,
	fetchAuthUrl,
	fetchChannels,
	fetchFollowedChannels,
	toggleFavorite,
	addFavorite,
	reorderFavorites,
	fetchUserByLogin,
	fetchVideos,
	watchLive,
	watchVod,
};

export type { AuthStatus, Channel, Stream, Vod, TwitchUser, TwitchVideo, SidebarChannel };
