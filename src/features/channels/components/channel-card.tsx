import { memo } from "react";

import { ChatIcon, StarIcon } from "@/src/shared/components/icons";
import {
	formatDate,
	formatDuration,
	formatThumbnail,
	formatViewers,
} from "@/src/shared/utils/format";

import { useToggleFavorite } from "../hooks/use-channels";
import { useOpenChat, useWatchLive, useWatchVod } from "../hooks/use-launch";

import type { Channel } from "../channels.types";

type ChannelCardProps = {
	channel: Channel;
	priority?: boolean;
	isDragging?: boolean;
};

function getWatchButtonClassName(isWatching: boolean) {
	const base = "py-2.5 px-4 rounded-md border text-sm font-semibold transition-all";

	if (isWatching) {
		return `${base} bg-twitch-purple border-twitch-purple text-white cursor-not-allowed`;
	}

	return `${base} bg-surface-elevated border-surface-border-muted text-text-primary hover:bg-twitch-purple hover:border-twitch-purple cursor-pointer`;
}

function getWatchButtonText(isWatchingLive: boolean, isWatchingVod: boolean, isLive: boolean) {
	if (isWatchingLive) return "Watching";
	if (isWatchingVod) return "Playing";
	if (isLive) return "Watch Live";
	return "Watch VOD";
}

function getChatButtonClassName(isOpeningChat: boolean) {
	const base = "py-2.5 px-3 rounded-md border transition-all";

	if (isOpeningChat) {
		return `${base} bg-surface-elevated border-surface-border-muted opacity-50 cursor-not-allowed text-text-muted`;
	}

	return `${base} bg-surface-elevated border-surface-border-muted text-text-muted hover:text-text-primary hover:bg-twitch-purple hover:border-twitch-purple cursor-pointer`;
}

function ChannelCardComponent({ channel, priority = false, isDragging = false }: ChannelCardProps) {
	const toggleFavoriteMutation = useToggleFavorite();
	const watchLiveMutation = useWatchLive();
	const watchVodMutation = useWatchVod();
	const openChatMutation = useOpenChat();

	const isToggling =
		toggleFavoriteMutation.isPending && toggleFavoriteMutation.variables === channel.id;
	const isWatchingLive = watchLiveMutation.isPending;
	const isWatchingVod = watchVodMutation.isPending;
	const isWatching = isWatchingLive || isWatchingVod;
	const isOpeningChat = openChatMutation.isPending;

	function handleWatchClick() {
		if (isWatching) return;

		if (channel.isLive) {
			watchLiveMutation.mutate(channel.login);
			return;
		}

		if (channel.latestVod !== null) {
			watchVodMutation.mutate({ id: channel.latestVod.id });
		}
	}

	function handleFavoriteClick(event: React.MouseEvent) {
		event.stopPropagation();
		if (!isToggling) {
			toggleFavoriteMutation.mutate(channel.id);
		}
	}

	function handleChatClick() {
		if (isOpeningChat) return;
		openChatMutation.mutate(channel.login);
	}

	const favoriteButtonLabel = channel.isFavorite
		? `Remove ${channel.displayName} from favorites`
		: `Add ${channel.displayName} to favorites`;

	const thumbnailUrl = getThumbnailUrl(channel);
	const hasContent = channel.isLive || channel.latestVod !== null;

	const cardClassName = `bg-surface-card border rounded-lg overflow-hidden transition-all hover:-translate-y-0.5 ${
		channel.isLive ? "border-live" : "border-surface-border-muted hover:border-surface-border"
	} ${isDragging ? "opacity-50 scale-95" : ""}`;

	return (
		<div className={cardClassName}>
			{/* Thumbnail */}
			<div className="relative aspect-video bg-surface-elevated">
				{thumbnailUrl !== null && (
					<img
						src={thumbnailUrl}
						alt={channel.displayName}
						className="w-full h-full object-cover"
						fetchPriority={priority ? "high" : "auto"}
						loading={priority ? "eager" : "lazy"}
					/>
				)}

				{channel.isLive && (
					<span className="absolute top-2.5 left-2.5 bg-live text-white text-xs font-bold px-2.5 py-1 rounded uppercase">
						Live
					</span>
				)}

				{!channel.isLive && (
					<div className="absolute inset-0 bg-black/50 flex items-center justify-center">
						<span className="bg-black/70 text-text-secondary text-sm font-semibold px-3 py-1.5 rounded uppercase">
							{channel.latestVod !== null ? "Offline" : "Offline - No VODs"}
						</span>
					</div>
				)}

				{channel.latestVod !== null && !channel.isLive && (
					<span className="absolute bottom-2 right-2 bg-black/80 text-white text-sm font-medium px-2 py-1 rounded">
						{formatDuration(channel.latestVod.duration)}
					</span>
				)}

				<button
					type="button"
					onClick={handleFavoriteClick}
					disabled={isToggling}
					aria-label={favoriteButtonLabel}
					aria-pressed={channel.isFavorite}
					className={`absolute top-2.5 right-2.5 bg-black/60 p-2 rounded-full transition-all hover:bg-black/80 hover:scale-110 ${
						channel.isFavorite ? "text-favorite" : "text-text-dim"
					} ${isToggling ? "opacity-50 cursor-not-allowed" : ""}`}
				>
					<StarIcon className="w-5 h-5" filled={channel.isFavorite} />
				</button>
			</div>

			{/* Info */}
			<div className="p-4">
				<div className="flex items-center gap-3 mb-3">
					{channel.profileImage ? (
						<img
							src={channel.profileImage}
							alt={channel.displayName}
							className="w-10 h-10 rounded-full object-cover flex-shrink-0"
						/>
					) : (
						<div className="w-10 h-10 rounded-full bg-surface-elevated flex items-center justify-center text-text-muted text-base font-semibold flex-shrink-0">
							{channel.displayName.charAt(0).toUpperCase()}
						</div>
					)}
					<span className="font-semibold text-base text-twitch-purple-light truncate">
						{channel.displayName}
					</span>
				</div>

				{channel.isLive && channel.stream !== null && (
					<>
						<div
							className="text-sm text-text-primary mb-2 line-clamp-2 min-h-[2.5rem]"
							title={channel.stream.title}
						>
							{channel.stream.title}
						</div>
						<div className="flex items-center gap-3 text-sm text-text-muted">
							<span>{channel.stream.gameName}</span>
							<span className="text-live font-semibold">
								{formatViewers(channel.stream.viewerCount)} viewers
							</span>
						</div>
					</>
				)}

				{!channel.isLive && channel.latestVod !== null && (
					<>
						<div
							className="text-sm text-text-primary mb-2 line-clamp-2 min-h-[2.5rem]"
							title={channel.latestVod.title}
						>
							{channel.latestVod.title}
						</div>
						<div className="flex items-center gap-3 text-sm text-text-muted">
							<span className="text-text-dim">
								{formatDuration(channel.latestVod.duration)}
							</span>
							<span>{formatDate(channel.latestVod.createdAt)}</span>
						</div>
					</>
				)}

				{hasContent && (
					<div className="flex gap-2 mt-4">
						<button
							type="button"
							onClick={handleWatchClick}
							disabled={isWatching}
							className={`flex-1 ${getWatchButtonClassName(isWatching)}`}
						>
							{getWatchButtonText(isWatchingLive, isWatchingVod, channel.isLive)}
						</button>
						{channel.isLive && (
							<button
								type="button"
								onClick={handleChatClick}
								disabled={isOpeningChat}
								aria-label={`Open chat for ${channel.displayName}`}
								title={isOpeningChat ? "Opening..." : "Open Chat"}
								className={getChatButtonClassName(isOpeningChat)}
							>
								<ChatIcon className="w-5 h-5" />
							</button>
						)}
					</div>
				)}
			</div>
		</div>
	);
}

function getThumbnailUrl(channel: Channel) {
	if (channel.isLive && channel.stream?.thumbnailUrl !== undefined) {
		return formatThumbnail(channel.stream.thumbnailUrl, 440, 248);
	}

	if (channel.latestVod?.thumbnailUrl !== undefined) {
		return formatThumbnail(channel.latestVod.thumbnailUrl, 440, 248);
	}

	return null;
}

const ChannelCard = memo(ChannelCardComponent);

export { ChannelCard };
