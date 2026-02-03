import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";

import { QUERY_KEYS } from "@/src/shared/query-keys";

import { fetchFollowedChannels } from "../api/sidebar-queries";

import type { SidebarChannel } from "../sidebar.types";

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
