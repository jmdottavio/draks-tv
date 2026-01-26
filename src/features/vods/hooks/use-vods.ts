import { useQuery } from "@tanstack/react-query";

import { fetchUsers, fetchVideos } from "../api/vods-queries";

import type { TwitchVideo } from "../vods.types";

function getVodsQueryKey(channelLogin: string) {
	return ["vods", channelLogin] as const;
}

interface VodSearchData {
	user: {
		id: string;
		login: string;
		display_name: string;
		profile_image_url: string;
	};
	videos: Array<TwitchVideo>;
}

interface UseVodSearchResult {
	data: VodSearchData | null;
	isLoading: boolean;
	error: Error | null;
}

function useVodSearch(channelLogin: string | null): UseVodSearchResult {
	const { data, isLoading, error } = useQuery({
		queryKey: channelLogin !== null ? getVodsQueryKey(channelLogin) : ["vods"],
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
		data: data ?? null,
		isLoading,
		error: error instanceof Error ? error : null,
	};
}

export { getVodsQueryKey, useVodSearch };
