import { extractApiErrorMessage } from "@/src/shared/utils/api-errors";

import type { TwitchUser, TwitchVideo } from "../vods.types";

async function fetchUsers(logins: Array<string>) {
	const encodedLogins = logins.map(encodeURIComponent);
	const loginsParam = encodedLogins.join(",");
	const response = await fetch(`/api/users?logins=${loginsParam}`);

	if (!response.ok) {
		const message = await extractApiErrorMessage(response, "Failed to fetch users");
		throw new Error(message);
	}

	return response.json() as Promise<Array<TwitchUser>>;
}

async function fetchVideos(userId: string) {
	const response = await fetch(`/api/videos?userId=${userId}`);

	if (!response.ok) {
		const message = await extractApiErrorMessage(response, "Failed to fetch videos");
		throw new Error(message);
	}

	return response.json() as Promise<Array<TwitchVideo>>;
}

async function fetchVodProgress(vodId: string) {
	const response = await fetch(`/api/vod-progress/${vodId}`);

	if (!response.ok) {
		const message = await extractApiErrorMessage(response, "Failed to fetch VOD progress");
		throw new Error(message);
	}

	const data = await response.json();
	return data.progress;
}

async function fetchVodProgressBulk(vodIds: Array<string>) {
	if (vodIds.length === 0) {
		return [];
	}

	const response = await fetch(`/api/vod-progress?ids=${vodIds.join(",")}`);

	if (!response.ok) {
		const message = await extractApiErrorMessage(response, "Failed to fetch VOD progress");
		throw new Error(message);
	}

	const data = await response.json();
	return data.progress;
}

async function fetchRecentProgress() {
	const response = await fetch("/api/vod-progress");

	if (!response.ok) {
		const message = await extractApiErrorMessage(response, "Failed to fetch recent progress");
		throw new Error(message);
	}

	const data = await response.json();
	return data.progress;
}

export { fetchRecentProgress, fetchUsers, fetchVideos, fetchVodProgress, fetchVodProgressBulk };
