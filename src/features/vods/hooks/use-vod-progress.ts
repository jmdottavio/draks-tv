import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo } from "react";

import {
	getVodProgressBulkQueryKey,
	getVodProgressQueryKey,
	QUERY_KEYS,
} from "@/src/shared/query-keys";

import { saveVodProgress } from "../api/vods-mutations";
import { fetchVodProgressBulk } from "../api/vods-queries";

import type { VodPlaybackProgressSelect } from "../vods.types";

const EMPTY_PROGRESS: Array<VodPlaybackProgressSelect> = [];

export function useVodProgressBulk(vodIds: Array<string>) {
	const { data, isLoading, error } = useQuery({
		queryKey: getVodProgressBulkQueryKey(vodIds),
		queryFn: () => fetchVodProgressBulk(vodIds),
		enabled: vodIds.length > 0,
		staleTime: 60_000,
		gcTime: 10 * 60 * 1000,
	});

	const progress = useMemo(() => data ?? EMPTY_PROGRESS, [data]);

	return {
		data: progress,
		isLoading,
		error: error instanceof Error ? error : null,
	};
}

export function useSaveVodProgress() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: saveVodProgress,
		onSuccess: (_, variables) => {
			queryClient.invalidateQueries({ queryKey: getVodProgressQueryKey(variables.vodId) });
			queryClient.invalidateQueries({ queryKey: QUERY_KEYS.vodProgress });
			queryClient.invalidateQueries({ queryKey: QUERY_KEYS.vodProgressRecent });
		},
	});
}
