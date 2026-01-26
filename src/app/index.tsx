import { createFileRoute } from "@tanstack/react-router";

import { ChannelGrid } from "@/src/shared/components/channel-grid";
import {
	useChannels,
	useToggleFavorite,
	useReorderFavorites,
} from "@/src/shared/hooks/use-channels";

export const Route = createFileRoute("/")({
	component: ChannelsPage,
});

function ChannelsPage() {
	const { data: channels, isLoading } = useChannels();
	const toggleFavoriteMutation = useToggleFavorite();
	const reorderFavoritesMutation = useReorderFavorites();

	function handleToggleFavorite(id: string) {
		toggleFavoriteMutation.mutate(id);
	}

	function handleReorderFavorites(orderedIds: Array<string>) {
		reorderFavoritesMutation.mutate(orderedIds);
	}

	if (isLoading) {
		return (
			<div className="flex items-center justify-center py-16 text-text-dim">
				<span>Loading channels</span>
				<span className="ml-3 w-6 h-6 border-2 border-surface-border-muted border-t-twitch-purple rounded-full animate-spin" />
			</div>
		);
	}

	if (channels === undefined) {
		return null;
	}

	return (
		<section className="animate-[fadeIn_0.2s_ease]">
			<ChannelGrid
				channels={channels}
				onToggleFavorite={handleToggleFavorite}
				onReorderFavorites={handleReorderFavorites}
			/>
		</section>
	);
}
