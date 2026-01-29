import { useMemo, useRef, useState } from "react";

import { useReorderFavorites } from "../hooks/use-channels";

import { ChannelCard } from "./channel-card";

import type { Channel } from "../channels.types";

type ChannelGridProps = {
	channels: Array<Channel>;
};

function ChannelGrid({ channels }: ChannelGridProps) {
	const [draggedId, setDraggedId] = useState<string | null>(null);
	const [dragOverId, setDragOverId] = useState<string | null>(null);
	const dragCounter = useRef(0);

	const reorderFavoritesMutation = useReorderFavorites();

	const { liveFavorites, offlineFavorites, liveNonFavorites, allFavorites, priorityIds } = useMemo(() => {
		const liveFavoriteChannels: Array<Channel> = [];
		const offlineFavoriteChannels: Array<Channel> = [];
		const liveNonFavoriteChannels: Array<Channel> = [];

		for (const channel of channels) {
			if (channel.isFavorite) {
				if (channel.isLive) {
					liveFavoriteChannels.push(channel);
				} else {
					offlineFavoriteChannels.push(channel);
				}
			} else if (channel.isLive) {
				liveNonFavoriteChannels.push(channel);
			}
		}

		// First 4 cards across all sections get priority loading
		const allVisibleChannels = [...liveFavoriteChannels, ...offlineFavoriteChannels, ...liveNonFavoriteChannels];
		const firstFourChannels = allVisibleChannels.slice(0, 4);
		const priorityChannelIds = new Set(firstFourChannels.map((channel) => channel.id));

		return {
			liveFavorites: liveFavoriteChannels,
			offlineFavorites: offlineFavoriteChannels,
			liveNonFavorites: liveNonFavoriteChannels,
			allFavorites: [...liveFavoriteChannels, ...offlineFavoriteChannels],
			priorityIds: priorityChannelIds,
		};
	}, [channels]);

	function handleDragStart(event: React.DragEvent, channelId: string) {
		setDraggedId(channelId);
		event.dataTransfer.effectAllowed = "move";
		event.dataTransfer.setData("text/plain", channelId);
	}

	function handleDragEnd() {
		setDraggedId(null);
		setDragOverId(null);
		dragCounter.current = 0;
	}

	function handleDragEnter(event: React.DragEvent, channelId: string) {
		event.preventDefault();
		dragCounter.current++;

		if (channelId !== draggedId) {
			setDragOverId(channelId);
		}
	}

	function handleDragLeave() {
		dragCounter.current--;

		if (dragCounter.current === 0) {
			setDragOverId(null);
		}
	}

	function handleDragOver(event: React.DragEvent) {
		event.preventDefault();
		event.dataTransfer.dropEffect = "move";
	}

	function handleDrop(event: React.DragEvent, targetId: string) {
		event.preventDefault();
		dragCounter.current = 0;

		if (draggedId === null || draggedId === targetId) {
			setDraggedId(null);
			setDragOverId(null);
			return;
		}

		const currentOrder = allFavorites.map((channel) => channel.id);
		const draggedIndex = currentOrder.indexOf(draggedId);
		const targetIndex = currentOrder.indexOf(targetId);

		if (draggedIndex === -1 || targetIndex === -1) {
			setDraggedId(null);
			setDragOverId(null);
			return;
		}

		const newOrder = [...currentOrder];
		newOrder.splice(draggedIndex, 1);
		newOrder.splice(targetIndex, 0, draggedId);

		reorderFavoritesMutation.mutate(newOrder);

		setDraggedId(null);
		setDragOverId(null);
	}

	function getDragClassName(channelId: string) {
		const isDragging = draggedId === channelId;
		const isDropTarget = dragOverId === channelId && draggedId !== channelId;

		let className = "cursor-grab active:cursor-grabbing transition-all duration-150";

		if (isDragging) {
			className += " opacity-50 scale-95";
		}

		if (isDropTarget) {
			className += " ring-2 ring-twitch-purple ring-offset-2 ring-offset-surface-page";
		}

		return className;
	}

	const hasVisibleChannels =
		liveFavorites.length > 0 || offlineFavorites.length > 0 || liveNonFavorites.length > 0;

	if (!hasVisibleChannels) {
		return (
			<div className="flex flex-col items-center justify-center text-center py-20 text-text-dim">
				<svg className="w-12 h-12 mb-4 opacity-30" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
					<circle cx="12" cy="12" r="10" />
				</svg>
				<p className="text-base font-medium text-text-secondary mb-1">
					No channels to show
				</p>
				<span className="text-sm">
					Add some favorites to see their latest VODs, or wait for channels to go live
				</span>
			</div>
		);
	}

	// Combined list in order: live favorites, offline favorites, live non-favorites
	const sortedChannels = [...liveFavorites, ...offlineFavorites, ...liveNonFavorites];

	return (
		<div className="grid grid-cols-[repeat(auto-fill,minmax(320px,1fr))] gap-5">
			{sortedChannels.map((channel) => {
				const isDraggable = channel.isFavorite;

				if (isDraggable) {
					return (
						<div
							key={channel.id}
							draggable
							onDragStart={(event) => handleDragStart(event, channel.id)}
							onDragEnd={handleDragEnd}
							onDragEnter={(event) => handleDragEnter(event, channel.id)}
							onDragLeave={handleDragLeave}
							onDragOver={handleDragOver}
							onDrop={(event) => handleDrop(event, channel.id)}
							className={getDragClassName(channel.id)}
						>
							<ChannelCard channel={channel} variant="full" priority={priorityIds.has(channel.id)} />
						</div>
					);
				}

				return (
					<ChannelCard
						key={channel.id}
						channel={channel}
						variant="full"
						priority={priorityIds.has(channel.id)}
					/>
				);
			})}
		</div>
	);
}

export { ChannelGrid };
