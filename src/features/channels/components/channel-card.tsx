import { memo, useCallback } from "react";

import { ChannelAvatar } from "@/src/features/channels/components/channel-avatar";
import { useToggleFavorite } from "@/src/features/channels/hooks/use-channels";
import { useOpenChat, useWatchLive, useWatchVod } from "@/src/features/channels/hooks/use-launch";
import { ChatIcon, StarIcon } from "@/src/shared/components/icons";
import {
	formatDate,
	formatDurationSeconds,
	formatThumbnail,
	formatViewers,
} from "@/src/shared/utils/format";

import type { Channel } from "@/src/features/channels/channels.types";

type ChannelCardProps = {
	channel: Channel;
	priority?: boolean;
	isDragging?: boolean;
};

// Static helper functions defined outside component to prevent recreation
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

function getThumbnailUrl(channel: Channel) {
	if (channel.isLive && channel.stream?.thumbnailUrl !== undefined) {
		return formatThumbnail(channel.stream.thumbnailUrl, 440, 248);
	}

	if (channel.latestVod?.thumbnailUrl !== undefined) {
		return formatThumbnail(channel.latestVod.thumbnailUrl, 440, 248);
	}

	return null;
}

/**
 * Custom comparison function for memo() that performs deep equality check
 * on the channel object. This is necessary because mutations may create
 * new channel objects with the same values.
 */
function arePropsEqual(prevProps: ChannelCardProps, nextProps: ChannelCardProps) {
	// Fast path: same reference means definitely equal
	if (prevProps.channel === nextProps.channel) {
		return (
			prevProps.priority === nextProps.priority &&
			prevProps.isDragging === nextProps.isDragging
		);
	}

	// Check primitive props first (fast)
	if (prevProps.priority !== nextProps.priority) return false;
	if (prevProps.isDragging !== nextProps.isDragging) return false;

	const prev = prevProps.channel;
	const next = nextProps.channel;

	// Check channel primitive fields
	if (prev.id !== next.id) return false;
	if (prev.channelName !== next.channelName) return false;
	if (prev.profileImage !== next.profileImage) return false;
	if (prev.isFavorite !== next.isFavorite) return false;
	if (prev.isLive !== next.isLive) return false;

	// Check stream (can be null)
	if (prev.stream === null && next.stream === null) {
		// Both null, continue
	} else if (prev.stream === null || next.stream === null) {
		return false;
	} else {
		if (prev.stream.title !== next.stream.title) return false;
		if (prev.stream.gameName !== next.stream.gameName) return false;
		if (prev.stream.viewerCount !== next.stream.viewerCount) return false;
		if (prev.stream.thumbnailUrl !== next.stream.thumbnailUrl) return false;
		if (prev.stream.startedAt !== next.stream.startedAt) return false;
	}

	// Check latestVod (can be null)
	if (prev.latestVod === null && next.latestVod === null) {
		// Both null, continue
	} else if (prev.latestVod === null || next.latestVod === null) {
		return false;
	} else {
		if (prev.latestVod.id !== next.latestVod.id) return false;
		if (prev.latestVod.title !== next.latestVod.title) return false;
		if (prev.latestVod.durationSeconds !== next.latestVod.durationSeconds) return false;
		if (prev.latestVod.createdAt !== next.latestVod.createdAt) return false;
		if (prev.latestVod.thumbnailUrl !== next.latestVod.thumbnailUrl) return false;
	}

	return true;
}

const ChannelCard = memo(function ChannelCard({
	channel,
	priority = false,
	isDragging = false,
}: ChannelCardProps) {
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

	let offlineLabel = "Offline - No VODs";
	if (channel.latestVod !== null) {
		offlineLabel = "Offline";
	}

	const handleWatchClick = useCallback(() => {
		if (isWatching) return;

		if (channel.isLive) {
			watchLiveMutation.mutate(channel.channelName);
			return;
		}

		if (channel.latestVod !== null) {
			watchVodMutation.mutate({ id: channel.latestVod.id });
		}
	}, [
		isWatching,
		channel.isLive,
		channel.channelName,
		channel.latestVod,
		watchLiveMutation,
		watchVodMutation,
	]);

	const handleFavoriteClick = useCallback(
		(event: React.MouseEvent) => {
			event.stopPropagation();
			if (!isToggling) {
				toggleFavoriteMutation.mutate(channel.id);
			}
		},
		[isToggling, toggleFavoriteMutation, channel.id],
	);

	const handleChatClick = useCallback(() => {
		if (isOpeningChat) return;
		openChatMutation.mutate(channel.channelName);
	}, [isOpeningChat, openChatMutation, channel.channelName]);

	const favoriteButtonLabel = channel.isFavorite
		? `Remove ${channel.channelName} from favorites`
		: `Add ${channel.channelName} to favorites`;

	const thumbnailUrl = getThumbnailUrl(channel);
	const hasContent = channel.isLive || channel.latestVod !== null;
	let cardBorderClassName = "border-surface-border-muted hover:border-surface-border";
	if (channel.isLive) {
		cardBorderClassName = "border-live";
	}

	let dragClassName = "";
	if (isDragging) {
		dragClassName = "opacity-50 scale-95";
	}

	const cardClassName = `bg-surface-card border rounded-lg overflow-hidden transition-all hover:-translate-y-0.5 ${cardBorderClassName} ${dragClassName}`;
	let thumbnailFetchPriority: "high" | "auto" = "auto";
	let thumbnailLoading: "eager" | "lazy" = "lazy";
	if (priority) {
		thumbnailFetchPriority = "high";
		thumbnailLoading = "eager";
	}

	let favoriteColorClassName = "text-text-dim";
	if (channel.isFavorite) {
		favoriteColorClassName = "text-favorite";
	}

	let favoriteToggleStateClassName = "";
	if (isToggling) {
		favoriteToggleStateClassName = "opacity-50 cursor-not-allowed";
	}

	const favoriteButtonClassName = `absolute top-2.5 right-2.5 bg-black/60 p-2 rounded-full transition-all hover:bg-black/80 hover:scale-110 ${favoriteColorClassName} ${favoriteToggleStateClassName}`;
	let chatButtonTitle = "Open Chat";
	if (isOpeningChat) {
		chatButtonTitle = "Opening...";
	}

	return (
		<div className={cardClassName}>
			{/* Thumbnail */}
			<div className="relative aspect-video bg-surface-elevated">
				{thumbnailUrl !== null && (
					<img
						src={thumbnailUrl}
						alt={channel.channelName}
						className="w-full h-full object-cover"
						fetchPriority={thumbnailFetchPriority}
						loading={thumbnailLoading}
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
							{offlineLabel}
						</span>
					</div>
				)}

				{channel.latestVod !== null && !channel.isLive && (
					<span className="absolute bottom-2 right-2 bg-black/80 text-white text-sm font-medium px-2 py-1 rounded">
						{formatDurationSeconds(channel.latestVod.durationSeconds)}
					</span>
				)}

				<button
					type="button"
					onClick={handleFavoriteClick}
					disabled={isToggling}
					aria-label={favoriteButtonLabel}
					aria-pressed={channel.isFavorite}
					className={favoriteButtonClassName}
				>
					<StarIcon className="w-5 h-5" filled={channel.isFavorite} />
				</button>
			</div>

			{/* Info */}
			<div className="p-4">
				<div className="flex items-center gap-3 mb-3">
				<ChannelAvatar
					channelName={channel.channelName}
					profileImage={channel.profileImage}
					sizeClassName="w-10 h-10"
					imageClassName="rounded-full object-cover"
					fallbackClassName="rounded-full bg-surface-elevated flex items-center justify-center text-text-muted text-base font-semibold"
					wrapperClassName="flex-shrink-0"
				/>
					<span className="font-semibold text-base text-twitch-purple-light truncate">
						{channel.channelName}
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
								{formatDurationSeconds(channel.latestVod.durationSeconds)}
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
								aria-label={`Open chat for ${channel.channelName}`}
								title={chatButtonTitle}
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
}, arePropsEqual);

export { ChannelCard };
