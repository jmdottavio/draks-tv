import { extractApiErrorMessage } from "@/src/shared/utils/api-errors";

import type { TwitchUser, TwitchVideo } from "../vods.types";

async function fetchUsers(logins: Array<string>): Promise<Array<TwitchUser>> {
	const encodedLogins = logins.map(encodeURIComponent);
	const loginsParam = encodedLogins.join(",");
	const response = await fetch(`/api/users?logins=${loginsParam}`);

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

export { fetchUsers, fetchVideos };
