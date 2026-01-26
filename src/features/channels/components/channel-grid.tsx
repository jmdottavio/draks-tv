import { useState, useRef } from "react";

import { ChannelCard } from "./channel-card";

import type { Channel } from "../channels.types";

interface ChannelGridProps {
	channels: Array<Channel>;
	onToggleFavorite: (id: string) => void;
	onReorderFavorites: (orderedIds: Array<string>) => void;
}

function ChannelGrid({ channels, onToggleFavorite, onReorderFavorites }: ChannelGridProps) {
	const [draggedId, setDraggedId] = useState<string | null>(null);
	const [dragOverId, setDragOverId] = useState<string | null>(null);
	const dragCounter = useRef(0);

	// Separate channels into categories
	const liveFavorites: Array<Channel> = [];
	const offlineFavorites: Array<Channel> = [];
	const nonFavoriteChannels: Array<Channel> = [];

	for (const channel of channels) {
		if (channel.isFavorite) {
			if (channel.isLive) {
				liveFavorites.push(channel);
			} else {
				offlineFavorites.push(channel);
			}
		} else {
			nonFavoriteChannels.push(channel);
		}
	}

	// Combined favorites for drag-and-drop ordering
	const allFavorites = [...liveFavorites, ...offlineFavorites];

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

		onReorderFavorites(newOrder);

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

	if (channels.length === 0) {
		return (
			<div className="flex flex-col items-center justify-center text-center py-20 text-text-dim">
				<svg className="w-12 h-12 mb-4 opacity-30" viewBox="0 0 24 24" fill="currentColor">
					<circle cx="12" cy="12" r="10" />
				</svg>
				<p className="text-base font-medium text-text-secondary mb-1">
					No channels to show
				</p>
				<span className="text-sm">
					Add some favorites or wait for followed channels to go live
				</span>
			</div>
		);
	}

	return (
		<div className="space-y-8">
			{/* Live Favorites - Full cards in grid */}
			{liveFavorites.length > 0 && (
				<div className="grid grid-cols-[repeat(auto-fill,minmax(320px,1fr))] gap-5">
					{liveFavorites.map((channel) => (
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
							<ChannelCard
								channel={channel}
								onToggleFavorite={onToggleFavorite}
								variant="full"
							/>
						</div>
					))}
				</div>
			)}

			{/* Offline Favorites - Compact cards in list */}
			{offlineFavorites.length > 0 && (
				<section>
					{liveFavorites.length > 0 && (
						<h3 className="text-xs font-bold text-text-dim uppercase tracking-widest mb-4 mt-2">
							Offline Favorites
						</h3>
					)}
					<div className="space-y-3">
						{offlineFavorites.map((channel) => (
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
								<ChannelCard
									channel={channel}
									onToggleFavorite={onToggleFavorite}
									variant="compact"
								/>
							</div>
						))}
					</div>
				</section>
			)}

			{/* Non-favorites - Full cards in grid */}
			{nonFavoriteChannels.length > 0 && (
				<section>
					{(liveFavorites.length > 0 || offlineFavorites.length > 0) && (
						<h3 className="text-xs font-bold text-text-dim uppercase tracking-widest mb-4 mt-2">
							Following
						</h3>
					)}
					<div className="grid grid-cols-[repeat(auto-fill,minmax(320px,1fr))] gap-5">
						{nonFavoriteChannels.map((channel) => (
							<ChannelCard
								key={channel.id}
								channel={channel}
								onToggleFavorite={onToggleFavorite}
								variant="full"
							/>
						))}
					</div>
				</section>
			)}
		</div>
	);
}

export { ChannelGrid };
