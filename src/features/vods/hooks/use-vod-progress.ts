import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
	getVodProgressBulkQueryKey,
	getVodProgressQueryKey,
	QUERY_KEYS,
} from "@/src/shared/query-keys";

import { deleteVodProgress, saveVodProgress } from "../api/vods-mutations";
import { fetchRecentProgress, fetchVodProgress, fetchVodProgressBulk } from "../api/vods-queries";

function useVodProgress(vodId: string) {
	return useQuery({
		queryKey: getVodProgressQueryKey(vodId),
		queryFn: () => fetchVodProgress(vodId),
		enabled: vodId !== "",
		staleTime: 60_000,
		gcTime: 10 * 60 * 1000,
	});
}

function useVodProgressBulk(vodIds: Array<string>) {
	return useQuery({
		queryKey: getVodProgressBulkQueryKey(vodIds),
		queryFn: () => fetchVodProgressBulk(vodIds),
		enabled: vodIds.length > 0,
		staleTime: 60_000,
		gcTime: 10 * 60 * 1000,
	});
}

function useVodRecentProgress() {
	return useQuery({
		queryKey: QUERY_KEYS.vodProgressRecent,
		queryFn: fetchRecentProgress,
		staleTime: 30_000,
		gcTime: 5 * 60 * 1000,
	});
}

function useSaveProgress() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: saveVodProgress,
		onSuccess: (_, variables) => {
			queryClient.invalidateQueries({ queryKey: getVodProgressQueryKey(variables.vodId) });
			queryClient.invalidateQueries({ queryKey: QUERY_KEYS.vodProgress });
		},
	});
}

function useDeleteProgress() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: deleteVodProgress,
		onSuccess: (_, vodId) => {
			queryClient.invalidateQueries({ queryKey: getVodProgressQueryKey(vodId) });
			queryClient.invalidateQueries({ queryKey: QUERY_KEYS.vodProgress });
		},
	});
}

export {
	useDeleteProgress,
	useSaveProgress,
	useVodProgress,
	useVodProgressBulk,
	useVodRecentProgress,
};
