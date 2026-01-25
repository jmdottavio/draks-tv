import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { fetchChannels, toggleFavorite, addFavorite } from '../lib/api';

function useChannels() {
  return useQuery({
    queryKey: ['channels'],
    queryFn: fetchChannels,
    refetchInterval: 60_000, // Refresh every minute
  });
}

function useToggleFavorite() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: toggleFavorite,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['channels'] });
    },
  });
}

function useAddFavorite() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: addFavorite,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['channels'] });
    },
  });
}

export { useChannels, useToggleFavorite, useAddFavorite };
