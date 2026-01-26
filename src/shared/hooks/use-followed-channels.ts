import { useQuery } from "@tanstack/react-query";

import { fetchFollowedChannels } from "../lib/api";

import type { SidebarChannel } from "../lib/api";

export const FOLLOWED_CHANNELS_QUERY_KEY = ["followed-channels"] as const;

interface UseFollowedChannelsResult {
	channels: Array<SidebarChannel>;
	isLoading: boolean;
	error: Error | null;
}

function useFollowedChannels(): UseFollowedChannelsResult {
	const { data, isLoading, error } = useQuery({
		queryKey: FOLLOWED_CHANNELS_QUERY_KEY,
		queryFn: fetchFollowedChannels,
		staleTime: 120_000,
		refetchInterval: 180_000,
	});

	return {
		channels: data ?? [],
		isLoading,
		error: error instanceof Error ? error : null,
	};
}

export { useFollowedChannels };
