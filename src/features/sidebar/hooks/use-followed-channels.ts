import { useQuery } from "@tanstack/react-query";

import { QUERY_KEYS } from "@/src/shared/query-keys";

import { fetchFollowedChannels } from "../api/sidebar-queries";

function useFollowedChannels() {
	const { data, isLoading, error } = useQuery({
		queryKey: QUERY_KEYS.followedChannels,
		queryFn: fetchFollowedChannels,
		staleTime: 60_000,
		gcTime: 10 * 60 * 1000,
		refetchInterval: 60_000,
		refetchIntervalInBackground: false,
	});

	return {
		channels: data ?? [],
		isLoading,
		error: error instanceof Error ? error : null,
	};
}

export { useFollowedChannels };
