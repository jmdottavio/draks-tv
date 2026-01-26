import { useQuery } from "@tanstack/react-query";

import { fetchFollowedChannels } from "../lib/api";

function useFollowedChannels() {
	return useQuery({
		queryKey: ["followed-channels"],
		queryFn: fetchFollowedChannels,
		staleTime: 120_000, // 2 minutes
		refetchInterval: 180_000, // Refresh every 3 minutes
	});
}

export { useFollowedChannels };
