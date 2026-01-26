import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import { fetchChannels, toggleFavorite, addFavorite, reorderFavorites } from "../lib/api";

import type { Channel } from "../lib/api";

function useChannels() {
	return useQuery({
		queryKey: ["channels"],
		queryFn: fetchChannels,
		refetchInterval: 60_000, // Refresh every minute
	});
}

function useToggleFavorite() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: toggleFavorite,
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["channels"] });
		},
	});
}

function useAddFavorite() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: addFavorite,
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["channels"] });
		},
	});
}

function useReorderFavorites() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: reorderFavorites,
		onMutate: async (orderedIds: Array<string>) => {
			await queryClient.cancelQueries({ queryKey: ["channels"] });

			const previousChannels = queryClient.getQueryData<Array<Channel>>(["channels"]);

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
					const channel = favoriteChannels.find((c) => c.id === id);

					if (channel !== undefined) {
						reorderedFavorites.push(channel);
					}
				}

				queryClient.setQueryData(
					["channels"],
					[...reorderedFavorites, ...nonFavoriteChannels],
				);
			}

			return { previousChannels };
		},
		onError: (_error, _orderedIds, context) => {
			if (context?.previousChannels !== undefined) {
				queryClient.setQueryData(["channels"], context.previousChannels);
			}
		},
		onSettled: () => {
			queryClient.invalidateQueries({ queryKey: ["channels"] });
		},
	});
}

export { useChannels, useToggleFavorite, useAddFavorite, useReorderFavorites };
