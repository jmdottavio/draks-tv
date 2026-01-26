import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import { fetchChannels } from "../api/channels-queries";
import { toggleFavorite, reorderFavoritesApi } from "../api/channels-mutations";

import type { Channel } from "../channels.types";

export const CHANNELS_QUERY_KEY = ["channels"] as const;

interface UseChannelsResult {
	channels: Array<Channel>;
	isLoading: boolean;
	isFetching: boolean;
	error: Error | null;
	refetch: () => void;
}

function useChannels(): UseChannelsResult {
	const { data, isLoading, isFetching, error, refetch } = useQuery({
		queryKey: CHANNELS_QUERY_KEY,
		queryFn: fetchChannels,
		refetchInterval: 60_000,
	});

	return {
		channels: data ?? [],
		isLoading,
		isFetching,
		error: error instanceof Error ? error : null,
		refetch,
	};
}

function useToggleFavorite() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: toggleFavorite,
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: CHANNELS_QUERY_KEY });
		},
	});
}

function useReorderFavorites() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: reorderFavoritesApi,
		onMutate: async (orderedIds: Array<string>) => {
			await queryClient.cancelQueries({ queryKey: CHANNELS_QUERY_KEY });

			const previousChannels = queryClient.getQueryData<Array<Channel>>(CHANNELS_QUERY_KEY);

			if (previousChannels !== undefined) {
				const favoriteChannels: Array<Channel> = [];
				const nonFavoriteChannels: Array<Channel> = [];

				for (const channel of previousChannels) {
					if (channel.isFavorite) {
						favoriteChannels.push(channel);
					} else {
						nonFavoriteChannels.push(channel);
					}
				}

				const reorderedFavorites: Array<Channel> = [];

				for (const id of orderedIds) {
					const channel = favoriteChannels.find(
						(favoriteChannel) => favoriteChannel.id === id,
					);

					if (channel !== undefined) {
						reorderedFavorites.push(channel);
					}
				}

				queryClient.setQueryData(CHANNELS_QUERY_KEY, [
					...reorderedFavorites,
					...nonFavoriteChannels,
				]);
			}

			return { previousChannels };
		},
		onError: (_error, _orderedIds, context) => {
			if (context?.previousChannels !== undefined) {
				queryClient.setQueryData(CHANNELS_QUERY_KEY, context.previousChannels);
			}
		},
		onSettled: () => {
			queryClient.invalidateQueries({ queryKey: CHANNELS_QUERY_KEY });
		},
	});
}

export { useChannels, useToggleFavorite, useReorderFavorites };
