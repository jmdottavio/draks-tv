import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { QUERY_KEYS } from "@/src/shared/query-keys";

import { reorderFavoritesApi, toggleFavorite } from "../api/channels-mutations";
import { fetchChannels } from "../api/channels-queries";

import type { SidebarChannel } from "@/src/features/sidebar/sidebar.types";
import type { Channel } from "../channels.types";

// Stable empty array reference - defined outside component to prevent recreation
const EMPTY_CHANNELS: Array<Channel> = [];

export function useChannels() {
	const { data, isLoading, isFetching, error, refetch } = useQuery({
		queryKey: QUERY_KEYS.channels,
		queryFn: fetchChannels,
		staleTime: 30_000,
		gcTime: 5 * 60 * 1000,
		refetchInterval: 30_000,
		refetchIntervalInBackground: false,
	});

	// Memoize to ensure stable reference - only changes when data actually changes
	const channels = useMemo(() => data ?? EMPTY_CHANNELS, [data]);

	// Memoize error to prevent new Error wrapper on each render
	const normalizedError = useMemo(() => (error instanceof Error ? error : null), [error]);

	return {
		channels,
		isLoading,
		isFetching,
		error: normalizedError,
		refetch,
	};
}

type ToggleFavoriteMutationContext = {
	previousChannels: Array<Channel> | undefined;
	previousFollowedChannels: Array<SidebarChannel> | undefined;
};

/**
 * Updates only the changed channel in the array, preserving references for unchanged channels.
 * This is critical for memoization - React.memo will skip re-renders for channels
 * whose object reference hasn't changed.
 */
function updateChannelFavoriteStatus<T extends { id: string; isFavorite: boolean }>(
	channels: Array<T>,
	channelId: string,
): Array<T> {
	const targetIndex = channels.findIndex((channel) => channel.id === channelId);

	// Channel not found - return original array (same reference)
	if (targetIndex === -1) {
		return channels;
	}

	// Create new array with same references except for the changed channel
	const result = [...channels];
	const targetChannel = channels[targetIndex] as T;
	result[targetIndex] = { ...targetChannel, isFavorite: !targetChannel.isFavorite } as T;

	return result;
}

export function useToggleFavorite() {
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
					updateChannelFavoriteStatus(previousChannels, channelId),
				);
			}

			if (previousFollowedChannels !== undefined) {
				queryClient.setQueryData(
					QUERY_KEYS.followedChannels,
					updateChannelFavoriteStatus(previousFollowedChannels, channelId),
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

export function useReorderFavorites() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: reorderFavoritesApi,
		onMutate: async (orderedIds: Array<string>) => {
			await queryClient.cancelQueries({ queryKey: QUERY_KEYS.channels });

			const previousChannels = queryClient.getQueryData<Array<Channel>>(QUERY_KEYS.channels);

			if (previousChannels !== undefined) {
				// Build a map for O(1) lookups - preserves original channel references
				const channelMap = new Map<string, Channel>();
				const nonFavoriteChannels: Array<Channel> = [];

				for (const channel of previousChannels) {
					if (channel.isFavorite) {
						channelMap.set(channel.id, channel);
					} else {
						nonFavoriteChannels.push(channel);
					}
				}

				// Reorder favorites using the map - same channel references, just reordered
				const reorderedFavorites: Array<Channel> = [];
				for (const id of orderedIds) {
					const channel = channelMap.get(id);
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
