import { useQuery } from "@tanstack/react-query";

import { getVodsQueryKey, QUERY_KEYS } from "@/src/shared/query-keys";

import { fetchChannelSearch } from "../api/vods-queries";

import type { TwitchChannelIdentity, TwitchVideo } from "../vods.types";

type VodSearchData = {
	channel: TwitchChannelIdentity;
	videos: Array<TwitchVideo>;
};

export function useVodSearch(channelName: string | null) {
	const { data, isLoading, error } = useQuery({
		queryKey: channelName !== null ? getVodsQueryKey(channelName) : QUERY_KEYS.vods,
		queryFn: async () => {
			if (channelName === null) {
				return null;
			}

			return fetchChannelSearch(channelName);
		},
		enabled: channelName !== null,
	});

	return {
		data: (data ?? null) as VodSearchData | null,
		isLoading,
		error: error instanceof Error ? error : null,
	};
}
