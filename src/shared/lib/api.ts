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

	if (!response.ok) {
		const message = await extractApiErrorMessage(response, "Failed to fetch auth status");
		throw new Error(message);
	}

	return response.json() as Promise<AuthStatus>;
}

async function fetchAuthUrl(): Promise<AuthUrl> {
	const response = await fetch("/api/auth/url");

	if (!response.ok) {
		const message = await extractApiErrorMessage(response, "Failed to fetch auth URL");
		throw new Error(message);
	}

	return response.json() as Promise<AuthUrl>;
}

async function fetchChannels(): Promise<Array<Channel>> {
	const response = await fetch("/api/channels");

	if (!response.ok) {
		const message = await extractApiErrorMessage(response, "Failed to fetch channels");
		throw new Error(message);
	}

	return response.json() as Promise<Array<Channel>>;
}

async function toggleFavorite(id: string): Promise<{ isFavorite: boolean }> {
	const response = await fetch(`/api/favorites/toggle/${id}`, { method: "POST" });

	if (!response.ok) {
		const message = await extractApiErrorMessage(response, "Failed to toggle favorite");
		throw new Error(message);
	}

	return response.json() as Promise<{ isFavorite: boolean }>;
}

async function fetchUsers(logins: Array<string>): Promise<Array<TwitchUser>> {
	const response = await fetch(`/api/users?logins=${logins.map(encodeURIComponent).join(",")}`);

	if (!response.ok) {
		const message = await extractApiErrorMessage(response, "Failed to fetch users");
		throw new Error(message);
	}

	return response.json() as Promise<Array<TwitchUser>>;
}

async function fetchVideos(userId: string): Promise<Array<TwitchVideo>> {
	const response = await fetch(`/api/videos?userId=${userId}`);

	if (!response.ok) {
		const message = await extractApiErrorMessage(response, "Failed to fetch videos");
		throw new Error(message);
	}

	return response.json() as Promise<Array<TwitchVideo>>;
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

	return response.json() as Promise<Array<SidebarChannel>>;
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
	reorderFavorites,
	fetchUsers,
	fetchVideos,
	watchLive,
	watchVod,
};

export type { Channel, TwitchVideo, SidebarChannel };
