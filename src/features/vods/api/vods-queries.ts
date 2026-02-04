import { extractApiErrorMessage } from "@/src/shared/utils/api-errors";

import { parseChannelSearchResponse, parseVodProgressResponse } from "../vods.validators";


export async function fetchChannelSearch(channelName: string) {
	const response = await fetch(
		`/api/channels/search?channelName=${encodeURIComponent(channelName)}`,
	);

	if (!response.ok) {
		const message = await extractApiErrorMessage(response, "Failed to fetch channel data");
		throw new Error(message);
	}

	const data: unknown = await response.json();
	const parsed = parseChannelSearchResponse(data);
	if (parsed instanceof Error) {
		throw parsed;
	}

	return parsed;
}

export async function fetchVodProgressBulk(vodIds: Array<string>) {
	if (vodIds.length === 0) {
		return [];
	}

	const response = await fetch(`/api/vod-progress?ids=${vodIds.join(",")}`);

	if (!response.ok) {
		const message = await extractApiErrorMessage(response, "Failed to fetch VOD progress");
		throw new Error(message);
	}

	const data: unknown = await response.json();
	const parsed = parseVodProgressResponse(data);
	if (parsed instanceof Error) {
		throw parsed;
	}

	return parsed;
}
