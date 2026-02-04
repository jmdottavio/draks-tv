import { extractApiErrorMessage } from "@/src/shared/utils/api-errors";

import type { TwitchChannelIdentity, TwitchVideo } from "../vods.types";

export type ChannelSearchResponse = {
	channel: TwitchChannelIdentity;
	videos: Array<TwitchVideo>;
};

export async function fetchChannelSearch(channelName: string) {
	const response = await fetch(
		`/api/channels/search?channelName=${encodeURIComponent(channelName)}`,
	);

	if (!response.ok) {
		const message = await extractApiErrorMessage(response, "Failed to fetch channel data");
		throw new Error(message);
	}

	return response.json() as Promise<ChannelSearchResponse>;
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

	const data = await response.json();
	return data.progress;
}
