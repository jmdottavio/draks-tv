import { extractApiErrorMessage } from "@/src/shared/utils/api-errors";

import type { Channel } from "../channels.types";

async function fetchChannels(): Promise<Array<Channel>> {
	const response = await fetch("/api/channels");

	if (!response.ok) {
		const message = await extractApiErrorMessage(response, "Failed to fetch channels");
		throw new Error(message);
	}

	return response.json() as Promise<Array<Channel>>;
}

export { fetchChannels };
