import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { QUERY_KEYS } from "@/src/shared/query-keys";

import { reorderFavoritesApi, toggleFavorite } from "../api/channels-mutations";
import { fetchChannels } from "../api/channels-queries";

import type { SidebarChannel } from "@/src/features/sidebar/sidebar.types";
import type { Channel } from "../channels.types";

function useChannels() {
	const { data, isLoading, isFetching, error, refetch } = useQuery({
		queryKey: QUERY_KEYS.channels,
		queryFn: fetchChannels,
		staleTime: 30_000,
		gcTime: 5 * 60 * 1000,
		refetchInterval: 30_000,
		refetchIntervalInBackground: false,
	});

	return {
		channels: data ?? [],
		isLoading,
		isFetching,
		error: error instanceof Error ? error : null,
		refetch,
	};
}

type ToggleFavoriteMutationContext = {
	previousChannels: Array<Channel> | undefined;
	previousFollowedChannels: Array<SidebarChannel> | undefined;
};

function useToggleFavorite() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: toggleFavorite,
		onMutate: async (channelId: string) => {
			await Promise.all([
				queryClient.cancelQueries({ queryKey: QUERY_KEYS.channels }),
				queryClient.cancelQueries({ queryKey: QUERY_KEYS.followedChannels }),
			]);

			const previousChannels = queryClient.getQueryData<Array<Channel>>(QUERY_KEYS.channels);
			const previousFollowedChannels = queryClient.getQueryData<Array<SidebarChannel>>(
				QUERY_KEYS.followedChannels,
			);

			if (previousChannels !== undefined) {
				queryClient.setQueryData(
					QUERY_KEYS.channels,
					previousChannels.map((channel) => {
						if (channel.id === channelId) {
							return { ...channel, isFavorite: !channel.isFavorite };
						}
						return channel;
					}),
				);
			}

			if (previousFollowedChannels !== undefined) {
				queryClient.setQueryData(
					QUERY_KEYS.followedChannels,
					previousFollowedChannels.map((channel) => {
						if (channel.id === channelId) {
							return { ...channel, isFavorite: !channel.isFavorite };
						}
						return channel;
					}),
				);
			}

			const context: ToggleFavoriteMutationContext = {
				previousChannels,
				previousFollowedChannels,
			};

			return context;
		},
		onError: (_error, _channelId, context) => {
			if (context?.previousChannels !== undefined) {
				queryClient.setQueryData(QUERY_KEYS.channels, context.previousChannels);
			}
			if (context?.previousFollowedChannels !== undefined) {
				queryClient.setQueryData(
					QUERY_KEYS.followedChannels,
					context.previousFollowedChannels,
				);
			}
		},
		onSettled: async () => {
			await Promise.all([
				queryClient.invalidateQueries({ queryKey: QUERY_KEYS.channels }),
				queryClient.invalidateQueries({ queryKey: QUERY_KEYS.followedChannels }),
			]);
		},
	});
}

function useReorderFavorites() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: reorderFavoritesApi,
		onMutate: async (orderedIds: Array<string>) => {
			await queryClient.cancelQueries({ queryKey: QUERY_KEYS.channels });

			const previousChannels = queryClient.getQueryData<Array<Channel>>(QUERY_KEYS.channels);

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

				queryClient.setQueryData(QUERY_KEYS.channels, [
					...reorderedFavorites,
					...nonFavoriteChannels,
				]);
			}

			return { previousChannels };
		},
		onError: (_error, _orderedIds, context) => {
			if (context?.previousChannels !== undefined) {
				queryClient.setQueryData(QUERY_KEYS.channels, context.previousChannels);
			}
		},
		onSettled: async () => {
			await queryClient.invalidateQueries({ queryKey: QUERY_KEYS.channels });
		},
	});
}

export { useChannels, useReorderFavorites, useToggleFavorite };
