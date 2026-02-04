import { useQueryClient } from "@tanstack/react-query";
import { memo, useCallback, useMemo } from "react";

import { toggleFavorite, watchLive } from "@/src/features/channels/api/channels-mutations";
import { StarIcon } from "@/src/shared/components/icons";
import { QUERY_KEYS } from "@/src/shared/query-keys";
import { formatDate, formatViewers } from "@/src/shared/utils/format";

import { useFollowedChannels } from "../hooks/use-followed-channels";

import type { SidebarChannel } from "../sidebar.types";

type ChannelItemProps = {
	channel: SidebarChannel;
	isExpanded: boolean;
	onFavoriteToggle: (id: string) => void;
};

function getOfflineStatusText(lastSeenAt: string | null): string {
	if (lastSeenAt !== null) {
		return `Last seen ${formatDate(lastSeenAt)}`;
	}
	return "Offline";
}

type CategorizedChannels = {
	live: Array<SidebarChannel>;
	offline: Array<SidebarChannel>;
};

function categorizeChannels(channels: Array<SidebarChannel>): CategorizedChannels {
	const live: Array<SidebarChannel> = [];
	const offline: Array<SidebarChannel> = [];

	for (const channel of channels) {
		if (channel.isLive) {
			live.push(channel);
		} else {
			offline.push(channel);
		}
	}

	return { live, offline };
}

type ChannelAvatarProps = {
	channel: SidebarChannel;
	isExpanded: boolean;
};

const ChannelAvatar = memo(function ChannelAvatar({ channel, isExpanded }: ChannelAvatarProps) {
	const ringColor = channel.isLive ? "ring-live" : "ring-sidebar-text-dim";
	const glowClass = channel.isLive ? "shadow-[0_0_8px_rgba(255,68,68,0.5)]" : "";
	const sizeClass = isExpanded ? "h-9 w-9" : "h-8 w-8";

	return (
		<div className="relative shrink-0 group/avatar">
			{channel.profileImage ? (
				<img
					src={channel.profileImage}
					alt={channel.channelName}
					className={`rounded-full ring-2 ${ringColor} ${glowClass} transition-all duration-200 ${sizeClass}`}
				/>
			) : (
				<div
					className={`rounded-full ring-2 ${ringColor} ${glowClass} transition-all duration-200 ${sizeClass} bg-sidebar-hover flex items-center justify-center text-sidebar-text-muted text-xs font-semibold`}
				>
					{channel.channelName.charAt(0).toUpperCase()}
				</div>
			)}
			{channel.isLive && (
				<span className="absolute -bottom-0.5 -right-0.5 flex h-3 w-3">
					<span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-live opacity-75" />
					<span className="relative inline-flex h-3 w-3 rounded-full bg-live border-2 border-sidebar-bg" />
				</span>
			)}
		</div>
	);
});

const ChannelStatusInfo = memo(function ChannelStatusInfo({
	channel,
}: {
	channel: SidebarChannel;
}) {
	if (channel.isLive) {
		return (
			<div className="flex items-center gap-2 text-sm">
				<span className="font-bold text-live">
					{formatViewers(channel.viewerCount ?? 0)}
				</span>
				{channel.gameName !== null && (
					<span className="truncate text-sidebar-text-muted">{channel.gameName}</span>
				)}
			</div>
		);
	}

	return (
		<div className="text-sm text-sidebar-text-dim">
			{getOfflineStatusText(channel.lastSeenAt)}
		</div>
	);
});

const ChannelItem = memo(function ChannelItem({
	channel,
	isExpanded,
	onFavoriteToggle,
}: ChannelItemProps) {
	const handleClick = useCallback(async () => {
		await watchLive(channel.channelName);
	}, [channel.channelName]);

	const handleFavoriteClick = useCallback(
		(event: React.MouseEvent) => {
			event.stopPropagation();
			onFavoriteToggle(channel.id);
		},
		[channel.id, onFavoriteToggle],
	);

	if (!isExpanded) {
		return (
			<button
				onClick={handleClick}
				title={`${channel.channelName}${channel.isLive ? " (LIVE)" : ""}`}
				className="group flex w-full items-center justify-center py-2 transition-colors hover:bg-sidebar-hover rounded-lg"
			>
				<ChannelAvatar channel={channel} isExpanded={false} />
			</button>
		);
	}

	return (
		<div className="group flex w-full items-center gap-3 rounded-lg px-3 py-1.5 transition-colors hover:bg-sidebar-hover">
			<button
				onClick={handleClick}
				className="flex flex-1 items-center gap-3 text-left min-w-0 cursor-pointer"
			>
				<ChannelAvatar channel={channel} isExpanded={true} />
				<div className="min-w-0 flex-1">
					<div className="truncate text-base font-semibold text-sidebar-text">
						{channel.channelName}
					</div>
					<ChannelStatusInfo channel={channel} />
				</div>
			</button>
			<button
				onClick={handleFavoriteClick}
				className={`shrink-0 p-1.5 rounded-md transition-all duration-200 opacity-0 group-hover:opacity-100 cursor-pointer ${
					channel.isFavorite
						? "opacity-100 text-favorite hover:text-favorite-hover"
						: "text-sidebar-text-dim hover:text-favorite hover:bg-sidebar-hover"
				}`}
				title={channel.isFavorite ? "Remove from favorites" : "Add to favorites"}
			>
				<StarIcon className="h-5 w-5" filled={channel.isFavorite} />
			</button>
		</div>
	);
});

function SidebarLoading({ isExpanded }: { isExpanded: boolean }) {
	return (
		<div className={`flex items-center justify-center ${isExpanded ? "py-12" : "py-6"}`}>
			<div className="h-7 w-7 animate-spin rounded-full border-2 border-sidebar-border border-t-twitch-purple" />
		</div>
	);
}

type SidebarErrorProps = {
	isExpanded: boolean;
	message: string;
};

function SidebarError({ isExpanded, message }: SidebarErrorProps) {
	if (!isExpanded) {
		return (
			<div className="flex justify-center py-6">
				<div className="h-2 w-2 rounded-full bg-live" title={message} />
			</div>
		);
	}

	return <div className="px-3 py-8 text-center text-sm text-live">{message}</div>;
}

type ChannelListProps = {
	channels: Array<SidebarChannel>;
	isExpanded: boolean;
	onFavoriteToggle: (id: string) => void;
};

const ChannelList = memo(function ChannelList({
	channels,
	isExpanded,
	onFavoriteToggle,
}: ChannelListProps) {
	const { live: liveChannels, offline: offlineChannels } = useMemo(
		() => categorizeChannels(channels),
		[channels],
	);

	if (channels.length === 0) {
		return (
			<div
				className={`py-8 text-center text-sm text-sidebar-text-dim ${!isExpanded && "px-1"}`}
			>
				{isExpanded ? "No followed channels" : "—"}
			</div>
		);
	}

	return (
		<div>
			{liveChannels.map((channel) => (
				<ChannelItem
					key={channel.id}
					channel={channel}
					isExpanded={isExpanded}
					onFavoriteToggle={onFavoriteToggle}
				/>
			))}

			{offlineChannels.map((channel) => (
				<ChannelItem
					key={channel.id}
					channel={channel}
					isExpanded={isExpanded}
					onFavoriteToggle={onFavoriteToggle}
				/>
			))}
		</div>
	);
});

export function Sidebar({ isExpanded }: { isExpanded: boolean }) {
	const { channels, isLoading, error } = useFollowedChannels();
	const queryClient = useQueryClient();

	// Stable callback reference - queryClient is stable from TanStack Query
	const handleFavoriteToggle = useCallback(
		async (id: string) => {
			await toggleFavorite(id);
			queryClient.invalidateQueries({ queryKey: QUERY_KEYS.followedChannels });
			queryClient.invalidateQueries({ queryKey: QUERY_KEYS.channels });
		},
		[queryClient],
	);

	return (
		<aside
			className={`fixed left-0 top-0 z-50 flex h-full flex-col border-r border-sidebar-border bg-sidebar-bg transition-all duration-300 ease-out ${
				isExpanded ? "w-72" : "w-16"
			}`}
		>
			<div
				className={`sidebar-scroll flex-1 overflow-y-auto ${isExpanded ? "px-2 py-3" : "px-1 py-2"}`}
			>
				{isLoading && <SidebarLoading isExpanded={isExpanded} />}
				{!isLoading && error !== null && (
					<SidebarError isExpanded={isExpanded} message={error.message} />
				)}
				{!isLoading && error === null && (
					<ChannelList
						channels={channels}
						isExpanded={isExpanded}
						onFavoriteToggle={handleFavoriteToggle}
					/>
				)}
			</div>
		</aside>
	);
}
