export const QUERY_KEYS = {
	auth: ["auth"] as const,
	channels: ["channels"] as const,
	followedChannels: ["followed-channels"] as const,
	vods: ["vods"] as const,
} as const;

export function getVodsQueryKey(channelLogin: string) {
	return ["vods", channelLogin] as const;
}
