import { createFileRoute } from "@tanstack/react-router";

import { ChannelGrid } from "@/src/features/channels/components/channel-grid";
import { useChannels } from "@/src/features/channels/hooks/use-channels";

export const Route = createFileRoute("/")({
	component: ChannelsPage,
});

function ChannelsPage() {
	const { channels, isLoading, error } = useChannels();

	if (isLoading) {
		return (
			<div className="flex items-center justify-center py-16 text-text-dim">
				<span>Loading channels</span>
				<span className="ml-3 w-6 h-6 border-2 border-surface-border-muted border-t-twitch-purple rounded-full animate-spin" />
			</div>
		);
	}

	if (error !== null) {
		return (
			<div className="flex items-center justify-center py-16">
				<p className="text-live text-sm">{error.message}</p>
			</div>
		);
	}

	return (
		<section className="animate-[fadeIn_0.2s_ease]">
			<ChannelGrid channels={channels} />
		</section>
	);
}
