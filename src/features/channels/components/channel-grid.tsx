import { useMemo } from "react";

import {
	DndContext,
	PointerSensor,
	closestCenter,
	useSensor,
	useSensors,
	type DragEndEvent,
} from "@dnd-kit/core";
import { SortableContext, arrayMove, rectSortingStrategy, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

import { GripIcon } from "@/src/shared/components/icons";

import { useReorderFavorites } from "../hooks/use-channels";

import { ChannelCard } from "./channel-card";

import type { Channel } from "../channels.types";

type ChannelGridProps = {
	channels: Array<Channel>;
};

type SortableChannelCardProps = {
	channel: Channel;
	priority: boolean;
};

function SortableChannelCard({ channel, priority }: SortableChannelCardProps) {
	const {
		attributes,
		listeners,
		setNodeRef,
		setActivatorNodeRef,
		transform,
		transition,
		isDragging,
	} = useSortable({
		id: channel.id,
		disabled: !channel.isFavorite,
	});

	const style = {
		transform: CSS.Transform.toString(transform),
		transition,
	};

	return (
		<div ref={setNodeRef} style={style} className="relative">
			{channel.isFavorite && (
				<div
					ref={setActivatorNodeRef}
					{...attributes}
					{...listeners}
					className="absolute -top-3 left-1/2 -translate-x-1/2 z-10 bg-surface-elevated border border-surface-border-muted rounded-md px-4 py-1 cursor-grab active:cursor-grabbing hover:bg-surface-card hover:border-twitch-purple transition-all"
				>
					<GripIcon className="w-4 h-4 text-text-dim rotate-90" />
				</div>
			)}
			<ChannelCard channel={channel} priority={priority} isDragging={isDragging} />
		</div>
	);
}

function ChannelGrid({ channels }: ChannelGridProps) {
	const sensors = useSensors(
		useSensor(PointerSensor, {
			activationConstraint: { distance: 8 },
		}),
	);

	const reorderFavoritesMutation = useReorderFavorites();

	const { allFavorites, allVisibleChannels, priorityIds } = useMemo(() => {
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

		// First 6 cards get priority loading (typically first row)
		const allVisibleChannels = [
			...liveFavoriteChannels,
			...offlineFavoriteChannels,
			...liveNonFavoriteChannels,
		];
		const priorityChannelIds = new Set(
			allVisibleChannels.slice(0, 6).map((channel) => channel.id),
		);

		return {
			allFavorites: [...liveFavoriteChannels, ...offlineFavoriteChannels],
			allVisibleChannels,
			priorityIds: priorityChannelIds,
		};
	}, [channels]);

	function handleDragEnd(event: DragEndEvent) {
		const { active, over } = event;

		if (over === null || active.id === over.id) {
			return;
		}

		const oldIndex = allFavorites.findIndex((channel) => channel.id === active.id);
		const newIndex = allFavorites.findIndex((channel) => channel.id === over.id);

		if (oldIndex === -1 || newIndex === -1) {
			return;
		}

		const currentOrder = allFavorites.map((channel) => channel.id);
		const newOrder = arrayMove(currentOrder, oldIndex, newIndex);
		reorderFavoritesMutation.mutate(newOrder);
	}

	const hasVisibleChannels = allVisibleChannels.length > 0;

	if (!hasVisibleChannels) {
		return (
			<div className="flex flex-col items-center justify-center text-center py-20 text-text-dim">
				<svg
					className="w-12 h-12 mb-4 opacity-30"
					viewBox="0 0 24 24"
					fill="currentColor"
					aria-hidden="true"
				>
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

	return (
		<DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
			<SortableContext
				items={allVisibleChannels.map((channel) => channel.id)}
				strategy={rectSortingStrategy}
			>
				<div className="grid grid-cols-[repeat(auto-fill,minmax(320px,1fr))] gap-5 pt-4">
					{allVisibleChannels.map((channel) => (
						<SortableChannelCard
							key={channel.id}
							channel={channel}
							priority={priorityIds.has(channel.id)}
						/>
					))}
				</div>
			</SortableContext>
		</DndContext>
	);
}

export { ChannelGrid };
