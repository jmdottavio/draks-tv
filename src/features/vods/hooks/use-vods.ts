import { useQuery } from "@tanstack/react-query";

import { fetchChannelSearch } from "@/src/features/vods/api/vods-queries";
import { getVodsQueryKey, QUERY_KEYS } from "@/src/shared/query-keys";

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
		data: data ?? null,
		isLoading,
		error: error instanceof Error ? error : null,
	};
}
