import { useQuery } from "@tanstack/react-query";

import { getVodsQueryKey, QUERY_KEYS } from "@/src/shared/query-keys";

import { fetchUsers, fetchVideos } from "../api/vods-queries";

import type { TwitchUser, TwitchVideo } from "../vods.types";

type VodSearchData = {
	user: TwitchUser;
	videos: Array<TwitchVideo>;
};

export function useVodSearch(channelLogin: string | null) {
	const { data, isLoading, error } = useQuery({
		queryKey: channelLogin !== null ? getVodsQueryKey(channelLogin) : QUERY_KEYS.vods,
		queryFn: async () => {
			if (channelLogin === null) {
				return null;
			}

			const users = await fetchUsers([channelLogin]);
			const user = users[0];

			if (user === undefined) {
				throw new Error(`Channel "${channelLogin}" not found`);
			}

			const videos = await fetchVideos(user.id);
			return { user, videos };
		},
		enabled: channelLogin !== null,
	});

	return {
		data: (data ?? null) as VodSearchData | null,
		isLoading,
		error: error instanceof Error ? error : null,
	};
}
