import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";

import { fetchFollowedChannels } from "@/src/features/sidebar/api/sidebar-queries";
import { QUERY_KEYS } from "@/src/shared/query-keys";

import type { SidebarChannel } from "@/src/features/sidebar/sidebar.types";

const EMPTY_CHANNELS: Array<SidebarChannel> = [];

export function useFollowedChannels() {
	const { data, isLoading, error } = useQuery({
		queryKey: QUERY_KEYS.followedChannels,
		queryFn: fetchFollowedChannels,
		staleTime: 60_000,
		gcTime: 10 * 60 * 1000,
		refetchInterval: 60_000,
		refetchIntervalInBackground: false,
	});

	const channels = useMemo(() => data ?? EMPTY_CHANNELS, [data]);

	return {
		channels,
		isLoading,
		error: error instanceof Error ? error : null,
	};
}
