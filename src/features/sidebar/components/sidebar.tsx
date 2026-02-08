import { useQueryClient } from "@tanstack/react-query";
import { memo, useCallback, useMemo } from "react";

import { toggleFavorite, watchLive } from "@/src/features/channels/api/channels-mutations";
import { FavoriteToggleButton } from "@/src/features/sidebar/components/favorite-toggle-button";
import {
	getLiveTitleTooltipId,
	LiveTitleTooltip,
} from "@/src/features/sidebar/components/live-title-tooltip";
import { SidebarChannelAvatar } from "@/src/features/sidebar/components/sidebar-channel-avatar";
import { SidebarChannelStatus } from "@/src/features/sidebar/components/sidebar-channel-status";
import { useFollowedChannels } from "@/src/features/sidebar/hooks/use-followed-channels";
import { QUERY_KEYS } from "@/src/shared/query-keys";

import type { SidebarChannel } from "@/src/features/sidebar/sidebar.types";

type ChannelItemProps = {
	channel: SidebarChannel;
	isExpanded: boolean;
	onFavoriteToggle: (id: string) => void;
};

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

const ChannelItem = memo(function ChannelItem({
	channel,
	isExpanded,
	onFavoriteToggle,
}: ChannelItemProps) {
	const handleClick = useCallback(async () => {
		try {
			await watchLive(channel.channelName);
		} catch (error) {
			const errorDetails = error instanceof Error ? error.message : error;
			console.error("Failed to launch stream:", errorDetails);
		}
	}, [channel.channelName]);

	let channelButtonTitle = channel.channelName;
	if (channel.isLive) {
		channelButtonTitle = `${channel.channelName} (LIVE)`;
	}

	let hasLiveStreamTitle = false;
	if (channel.isLive && channel.streamTitle !== null) {
		const trimmedStreamTitle = channel.streamTitle.trim();
		if (trimmedStreamTitle.length > 0) {
			hasLiveStreamTitle = true;
		}
	}

	let nativeTitleText: string | undefined = channelButtonTitle;
	if (hasLiveStreamTitle) {
		nativeTitleText = undefined;
	}

	const tooltipId = getLiveTitleTooltipId(channel);

	if (!isExpanded) {
		return (
			<LiveTitleTooltip channel={channel} tooltipId={tooltipId}>
				<button
					onClick={handleClick}
					title={nativeTitleText}
					aria-label={channelButtonTitle}
					aria-describedby={tooltipId}
					className="flex w-full items-center justify-center rounded-lg py-2 transition-colors hover:bg-sidebar-hover"
				>
					<SidebarChannelAvatar channel={channel} isExpanded={false} />
				</button>
			</LiveTitleTooltip>
		);
	}

	return (
		<LiveTitleTooltip
			channel={channel}
			tooltipId={tooltipId}
			className="flex w-full items-center gap-3 rounded-lg px-3 py-1.5 transition-colors hover:bg-sidebar-hover"
		>
			<button
				onClick={handleClick}
				title={nativeTitleText}
				aria-describedby={tooltipId}
				className="flex min-w-0 flex-1 items-center gap-3 text-left"
			>
				<SidebarChannelAvatar channel={channel} isExpanded={true} />
				<div className="min-w-0 flex-1">
					<div className="truncate text-base font-semibold text-sidebar-text">
						{channel.channelName}
					</div>
					<SidebarChannelStatus channel={channel} />
				</div>
			</button>
			<FavoriteToggleButton
				channelId={channel.id}
				isFavorite={channel.isFavorite}
				onToggle={onFavoriteToggle}
			/>
		</LiveTitleTooltip>
	);
});

function SidebarLoading({ isExpanded }: { isExpanded: boolean }) {
	let paddingClassName = "py-6";
	if (isExpanded) {
		paddingClassName = "py-12";
	}

	return (
		<div className={`flex items-center justify-center ${paddingClassName}`}>
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
		let emptyText = "—";
		let emptyPaddingClassName = "px-1";

		if (isExpanded) {
			emptyText = "No followed channels";
			emptyPaddingClassName = "";
		}

		return (
			<div
				className={`py-8 text-center text-sm text-sidebar-text-dim ${emptyPaddingClassName}`}
			>
				{emptyText}
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
	let sidebarWidthClassName = "w-16";
	let scrollPaddingClassName = "px-1 py-2";

	if (isExpanded) {
		sidebarWidthClassName = "w-72";
		scrollPaddingClassName = "px-2 py-3";
	}

	const sidebarClassName = `fixed left-0 top-0 z-50 flex h-full flex-col border-r border-sidebar-border bg-sidebar-bg transition-all duration-300 ease-out ${sidebarWidthClassName}`;
	const scrollClassName = `sidebar-scroll flex-1 overflow-y-auto overflow-x-visible ${scrollPaddingClassName}`;

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
		<aside className={sidebarClassName}>
			<div className={scrollClassName}>
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
