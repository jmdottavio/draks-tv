import { useQueryClient } from "@tanstack/react-query";

import { useFollowedChannels } from "../hooks/use-followed-channels";
import { watchLive, toggleFavorite } from "../lib/api";
import { formatViewers, formatDate } from "../lib/format";
import { ChevronLeftIcon, ChevronRightIcon, StarIcon } from "./icons";

import type { SidebarChannel } from "../lib/api";

interface SidebarProps {
	isExpanded: boolean;
	onToggle: () => void;
}

interface ChannelItemProps {
	channel: SidebarChannel;
	isExpanded: boolean;
	onFavoriteToggle: (id: string) => void;
}

function getOfflineStatusText(lastVodDate: string | null): string {
	if (lastVodDate !== null) {
		return `Last seen ${formatDate(lastVodDate)}`;
	}
	return "Offline";
}

function categorizeChannels(channels: Array<SidebarChannel> | undefined): {
	live: Array<SidebarChannel>;
	offline: Array<SidebarChannel>;
} {
	const live: Array<SidebarChannel> = [];
	const offline: Array<SidebarChannel> = [];

	if (channels === undefined) {
		return { live, offline };
	}

	for (const channel of channels) {
		if (channel.isLive) {
			live.push(channel);
		} else {
			offline.push(channel);
		}
	}

	return { live, offline };
}

function ChannelAvatar({ channel, isExpanded }: { channel: SidebarChannel; isExpanded: boolean }) {
	const ringColor = channel.isLive ? "ring-live" : "ring-sidebar-text-dim";
	const glowClass = channel.isLive ? "shadow-[0_0_8px_rgba(255,68,68,0.5)]" : "";
	const sizeClass = isExpanded ? "h-9 w-9" : "h-8 w-8";

	return (
		<div className="relative shrink-0 group/avatar">
			{channel.profileImage ? (
				<img
					src={channel.profileImage}
					alt={channel.displayName}
					className={`rounded-full ring-2 ${ringColor} ${glowClass} transition-all duration-200 ${sizeClass}`}
				/>
			) : (
				<div
					className={`rounded-full ring-2 ${ringColor} ${glowClass} transition-all duration-200 ${sizeClass} bg-sidebar-hover flex items-center justify-center text-sidebar-text-muted text-xs font-semibold`}
				>
					{channel.displayName.charAt(0).toUpperCase()}
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
}

function ChannelItem({ channel, isExpanded, onFavoriteToggle }: ChannelItemProps) {
	async function handleClick() {
		await watchLive(channel.login);
	}

	function handleFavoriteClick(event: React.MouseEvent) {
		event.stopPropagation();
		onFavoriteToggle(channel.id);
	}

	if (!isExpanded) {
		return (
			<button
				onClick={handleClick}
				title={`${channel.displayName}${channel.isLive ? " (LIVE)" : ""}`}
				className="group flex w-full items-center justify-center py-2 transition-colors hover:bg-sidebar-hover rounded-lg"
			>
				<ChannelAvatar channel={channel} isExpanded={false} />
			</button>
		);
	}

	return (
		<div className="group flex w-full items-center gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-sidebar-hover">
			<button
				onClick={handleClick}
				className="flex flex-1 items-center gap-3 text-left min-w-0"
			>
				<ChannelAvatar channel={channel} isExpanded={true} />
				<div className="min-w-0 flex-1">
					<div className="truncate text-base font-semibold text-sidebar-text">
						{channel.displayName}
					</div>
					<ChannelStatusInfo channel={channel} />
				</div>
			</button>
			<button
				onClick={handleFavoriteClick}
				className={`shrink-0 p-1.5 rounded-md transition-all duration-200 opacity-0 group-hover:opacity-100 ${
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
}

function ChannelStatusInfo({ channel }: { channel: SidebarChannel }) {
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
			{getOfflineStatusText(channel.lastVodDate)}
		</div>
	);
}

function SidebarLoading({ isExpanded }: { isExpanded: boolean }) {
	return (
		<div className={`flex items-center justify-center ${isExpanded ? "py-12" : "py-6"}`}>
			<div className="h-7 w-7 animate-spin rounded-full border-2 border-sidebar-border border-t-twitch-purple" />
		</div>
	);
}

function SectionHeader({
	title,
	count,
	isExpanded,
}: {
	title: string;
	count: number;
	isExpanded: boolean;
}) {
	if (!isExpanded) {
		return (
			<div className="flex justify-center py-2">
				<div
					className={`h-1.5 w-6 rounded-full ${title === "Live" ? "bg-live" : "bg-sidebar-text-dim"}`}
				/>
			</div>
		);
	}

	return (
		<div className="flex items-center gap-2 px-3 py-2">
			<span
				className={`text-xs font-bold uppercase tracking-wider ${
					title === "Live" ? "text-live" : "text-sidebar-text-dim"
				}`}
			>
				{title}
			</span>
			<span className="text-xs font-semibold text-sidebar-text-muted">({count})</span>
		</div>
	);
}

interface ChannelListProps {
	channels: Array<SidebarChannel> | undefined;
	isExpanded: boolean;
	onFavoriteToggle: (id: string) => void;
}

function ChannelList({ channels, isExpanded, onFavoriteToggle }: ChannelListProps) {
	const { live: liveChannels, offline: offlineChannels } = categorizeChannels(channels);

	if (channels?.length === 0) {
		return (
			<div
				className={`py-8 text-center text-sm text-sidebar-text-dim ${!isExpanded && "px-1"}`}
			>
				{isExpanded ? "No followed channels" : "—"}
			</div>
		);
	}

	return (
		<div className="space-y-4">
			{liveChannels.length > 0 && (
				<div>
					<SectionHeader
						title="Live"
						count={liveChannels.length}
						isExpanded={isExpanded}
					/>
					<div className="space-y-1">
						{liveChannels.map((channel) => (
							<ChannelItem
								key={channel.id}
								channel={channel}
								isExpanded={isExpanded}
								onFavoriteToggle={onFavoriteToggle}
							/>
						))}
					</div>
				</div>
			)}

			{offlineChannels.length > 0 && (
				<div>
					<SectionHeader
						title="Offline"
						count={offlineChannels.length}
						isExpanded={isExpanded}
					/>
					<div className="space-y-1">
						{offlineChannels.map((channel) => (
							<ChannelItem
								key={channel.id}
								channel={channel}
								isExpanded={isExpanded}
								onFavoriteToggle={onFavoriteToggle}
							/>
						))}
					</div>
				</div>
			)}
		</div>
	);
}

function Sidebar({ isExpanded, onToggle }: SidebarProps) {
	const { data: channels, isLoading } = useFollowedChannels();
	const queryClient = useQueryClient();

	async function handleFavoriteToggle(id: string) {
		await toggleFavorite(id);
		queryClient.invalidateQueries({ queryKey: ["followed-channels"] });
		queryClient.invalidateQueries({ queryKey: ["channels"] });
	}

	return (
		<>
			{/* Mobile backdrop */}
			{isExpanded && (
				<div
					className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
					onClick={onToggle}
				/>
			)}

			<aside
				className={`fixed left-0 top-0 z-50 flex h-full flex-col border-r border-sidebar-border bg-sidebar-bg transition-all duration-300 ease-out ${
					isExpanded ? "w-72" : "w-16"
				}`}
			>
				{/* Header */}
				<div
					className={`flex items-center border-b border-sidebar-border ${
						isExpanded ? "justify-between px-4 py-4" : "justify-center py-4"
					}`}
				>
					{isExpanded && (
						<h2 className="text-base font-bold text-sidebar-text tracking-tight">
							Followed Channels
						</h2>
					)}
					<button
						onClick={onToggle}
						className="rounded-lg p-2 text-sidebar-text-muted transition-colors hover:bg-sidebar-hover hover:text-sidebar-text"
						title={isExpanded ? "Collapse sidebar" : "Expand sidebar"}
					>
						{isExpanded ? (
							<ChevronLeftIcon className="h-5 w-5" />
						) : (
							<ChevronRightIcon className="h-5 w-5" />
						)}
					</button>
				</div>

				{/* Channel list */}
				<div
					className={`sidebar-scroll flex-1 overflow-y-auto ${isExpanded ? "px-2 py-3" : "px-1 py-2"}`}
				>
					{isLoading ? (
						<SidebarLoading isExpanded={isExpanded} />
					) : (
						<ChannelList
							channels={channels}
							isExpanded={isExpanded}
							onFavoriteToggle={handleFavoriteToggle}
						/>
					)}
				</div>
			</aside>
		</>
	);
}

export { Sidebar };
