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
import { memo, useCallback, useMemo } from "react";

import { ChannelCard } from "@/src/features/channels/components/channel-card";
import { useReorderFavorites } from "@/src/features/channels/hooks/use-channels";
import { useWatchVod } from "@/src/features/channels/hooks/use-launch";
import { VodCard } from "@/src/features/vods/components/vod-card";
import { useSaveVodProgress, useVodProgressBulk } from "@/src/features/vods/hooks/use-vod-progress";
import { GripIcon } from "@/src/shared/components/icons";
import { formatDurationSeconds } from "@/src/shared/utils/format";

import type { Channel } from "@/src/features/channels/channels.types";
import type { VodCardData } from "@/src/features/vods/components/vod-card";
import type { SaveProgressInput, VodProgressSelect } from "@/src/features/vods/vods.types";

function getVodCardData(channel: Channel): VodCardData | null {
	if (channel.latestVod === null) {
		return null;
	}

	return {
		id: channel.latestVod.id,
		title: channel.latestVod.title,
		channelName: channel.channelName,
		createdAt: channel.latestVod.createdAt,
		durationSeconds: channel.latestVod.durationSeconds,
		durationLabel: formatDurationSeconds(channel.latestVod.durationSeconds),
		thumbnailUrl: channel.latestVod.thumbnailUrl,
	};
}

type ChannelGridProps = {
	channels: Array<Channel>;
};

type SortableChannelCardProps = {
	channel: Channel;
	priority: boolean;
	vodProgressMap: Map<string, VodProgressSelect>;
	onWatchVod: (vodId: string, startTimeSeconds?: number) => void;
	onSaveProgress: (data: SaveProgressInput) => void;
};

const SortableChannelCard = memo(function SortableChannelCard({
	channel,
	priority,
	vodProgressMap,
	onWatchVod,
	onSaveProgress,
}: SortableChannelCardProps) {
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

	const style = useMemo(
		() => ({
			transform: CSS.Transform.toString(transform),
			transition,
		}),
		[transform, transition],
	);

	const vodCardData = getVodCardData(channel);
	const shouldShowVodCard = channel.isFavorite && !channel.isLive && vodCardData !== null;

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
			{shouldShowVodCard && (
				<div className={isDragging ? "opacity-50 scale-95" : ""}>
					<VodCard
						vod={vodCardData}
						progress={vodProgressMap.get(vodCardData.id) ?? null}
						onWatch={onWatchVod}
						onSaveProgress={onSaveProgress}
						showOfflineBadge={true}
					/>
				</div>
			)}
			{!shouldShowVodCard && (
				<ChannelCard channel={channel} priority={priority} isDragging={isDragging} />
			)}
		</div>
	);
});

function ChannelGrid({ channels }: ChannelGridProps) {
	const sensors = useSensors(
		useSensor(PointerSensor, {
			activationConstraint: { distance: 8 },
		}),
	);

	const reorderFavoritesMutation = useReorderFavorites();
	const saveProgressMutation = useSaveVodProgress();
	const watchVodMutation = useWatchVod();

	const { allFavorites, allVisibleChannels, offlineFavoriteChannels, priorityIds } =
		useMemo(() => {
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
				offlineFavoriteChannels,
				priorityIds: priorityChannelIds,
			};
		}, [channels]);

	const offlineVodIds = useMemo(() => {
		const ids: Array<string> = [];
		for (const channel of offlineFavoriteChannels) {
			if (channel.latestVod !== null) {
				ids.push(channel.latestVod.id);
			}
		}
		return ids;
	}, [offlineFavoriteChannels]);

	const { data: vodProgressData } = useVodProgressBulk(offlineVodIds);

	const vodProgressMap = useMemo(() => {
		const map = new Map<string, VodProgressSelect>();
		for (const item of vodProgressData) {
			map.set(item.vodId, item);
		}
		return map;
	}, [vodProgressData]);

	const handleWatchVod = useCallback(
		(vodId: string, startTimeSeconds?: number) => {
			if (startTimeSeconds === undefined) {
				watchVodMutation.mutate({ id: vodId });
				return;
			}
			watchVodMutation.mutate({ id: vodId, startTimeSeconds });
		},
		[watchVodMutation],
	);

	const handleDragEnd = useCallback(
		(event: DragEndEvent) => {
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
		},
		[allFavorites, reorderFavoritesMutation],
	);

	// Memoize the sortable items array to prevent unnecessary SortableContext re-renders
	const sortableItems = useMemo(
		() => allVisibleChannels.map((channel) => channel.id),
		[allVisibleChannels],
	);

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
			<SortableContext items={sortableItems} strategy={rectSortingStrategy}>
				<div className="grid grid-cols-[repeat(auto-fill,minmax(320px,1fr))] gap-5 pt-4">
					{allVisibleChannels.map((channel) => (
						<SortableChannelCard
							key={channel.id}
							channel={channel}
							priority={priorityIds.has(channel.id)}
							vodProgressMap={vodProgressMap}
							onWatchVod={handleWatchVod}
							onSaveProgress={saveProgressMutation.mutate}
						/>
					))}
				</div>
			</SortableContext>
		</DndContext>
	);
}

export { ChannelGrid };
