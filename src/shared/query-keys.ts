export const QUERY_KEYS = {
	auth: ["auth"] as const,
	channels: ["channels"] as const,
	followedChannels: ["followed-channels"] as const,
	vods: ["vods"] as const,
	vodProgress: ["vod-progress"] as const,
	vodProgressRecent: ["vod-progress", "recent"] as const,
} as const;

export function getVodsQueryKey(channelLogin: string) {
	return ["vods", channelLogin] as const;
}

export function getVodProgressQueryKey(vodId: string) {
	return ["vod-progress", vodId] as const;
}

export function getVodProgressBulkQueryKey(vodIds: Array<string>) {
	return ["vod-progress", "bulk", vodIds.toSorted().join(",")] as const;
}
