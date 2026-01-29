import { memo } from "react";

import { ChatIcon, StarIcon } from "@/src/shared/components/icons";
import {
	formatDate,
	formatDuration,
	formatThumbnail,
	formatViewers,
} from "@/src/shared/utils/format";

import { watchVod } from "@/src/features/vods/api/vods-mutations";
import { openChat } from "../api/chat-mutations";
import { watchLive } from "../api/channels-mutations";
import { useToggleFavorite } from "../hooks/use-channels";

import type { Channel } from "../channels.types";

type ChannelCardProps = {
	channel: Channel;
	variant?: "full" | "compact";
	priority?: boolean;
};

function ChannelCardComponent({ channel, variant = "full", priority = false }: ChannelCardProps) {
	const toggleFavoriteMutation = useToggleFavorite();

	const isToggling =
		toggleFavoriteMutation.isPending && toggleFavoriteMutation.variables === channel.id;

	function handleWatchClick() {
		if (channel.isLive) {
			watchLive(channel.login).catch((error: unknown) => {
				console.error("Failed to launch live stream:", error);
			});
			return;
		}

		if (channel.latestVod !== null) {
			watchVod(channel.latestVod.id).catch((error: unknown) => {
				console.error("Failed to launch VOD:", error);
			});
		}
	}

	function handleFavoriteClick(event: React.MouseEvent) {
		event.stopPropagation();
		if (!isToggling) {
			toggleFavoriteMutation.mutate(channel.id);
		}
	}

	function handleChatClick() {
		openChat(channel.login).catch((error: unknown) => {
			console.error("Failed to open chat:", error);
		});
	}

	const favoriteButtonLabel = channel.isFavorite
		? `Remove ${channel.displayName} from favorites`
		: `Add ${channel.displayName} to favorites`;

	// Compact variant for offline favorites
	if (variant === "compact") {
		return (
			<div className="flex items-center gap-4 bg-surface-card border border-surface-border-muted rounded-lg px-5 py-4 transition-all hover:border-surface-border">
				{channel.profileImage ? (
					<img
						src={channel.profileImage}
						alt={channel.displayName}
						className="w-12 h-12 rounded-full object-cover flex-shrink-0"
					/>
				) : (
					<div className="w-12 h-12 rounded-full bg-surface-elevated flex items-center justify-center text-text-muted text-lg font-semibold flex-shrink-0">
						{channel.displayName.charAt(0).toUpperCase()}
					</div>
				)}

				<div className="flex-1 min-w-0">
					<span className="font-semibold text-base text-twitch-purple-light truncate block">
						{channel.displayName}
					</span>
					{channel.latestVod !== null && (
						<span className="text-sm text-text-muted truncate block">
							{channel.latestVod.title}
						</span>
					)}
					{channel.latestVod !== null && (
						<span className="text-sm text-text-dim">
							{formatDuration(channel.latestVod.duration)} ·{" "}
							{formatDate(channel.latestVod.createdAt)}
						</span>
					)}
				</div>

				<div className="flex items-center gap-2 flex-shrink-0">
					{channel.latestVod !== null && (
						<button
							type="button"
							onClick={handleWatchClick}
							className="py-2 px-4 rounded-md bg-surface-elevated border border-surface-border-muted text-text-primary text-sm font-semibold hover:bg-twitch-purple hover:border-twitch-purple transition-all"
						>
							Watch VOD
						</button>
					)}
					<button
						type="button"
						onClick={handleFavoriteClick}
						disabled={isToggling}
						aria-label={favoriteButtonLabel}
						aria-pressed={channel.isFavorite}
						className={`p-2 rounded-full transition-all hover:scale-110 ${
							channel.isFavorite ? "text-favorite" : "text-text-dim"
						} ${isToggling ? "opacity-50 cursor-not-allowed" : ""}`}
					>
						<StarIcon className="w-5 h-5" filled={channel.isFavorite} />
					</button>
				</div>
			</div>
		);
	}

	// Full variant (default)
	const thumbnailUrl = getThumbnailUrl(channel);
	const hasContent = channel.isLive || channel.latestVod !== null;

	return (
		<div
			className={`bg-surface-card border rounded-lg overflow-hidden transition-all hover:-translate-y-0.5 ${
				channel.isLive
					? "border-live"
					: "border-surface-border-muted hover:border-surface-border"
			}`}
		>
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
							className="text-sm text-text-primary mb-2 line-clamp-2"
							title={channel.stream.title}
						>
							{channel.stream.title}
						</div>
						<div className="flex items-center gap-3 text-sm text-text-muted mb-4">
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
							className="text-sm text-text-primary mb-2 line-clamp-2"
							title={channel.latestVod.title}
						>
							{channel.latestVod.title}
						</div>
						<div className="flex items-center gap-3 text-sm text-text-muted mb-4">
							<span className="text-text-dim">
								{formatDuration(channel.latestVod.duration)}
							</span>
							<span>{formatDate(channel.latestVod.createdAt)}</span>
						</div>
					</>
				)}

				{hasContent && (
					<div className="flex gap-2">
						<button
							type="button"
							onClick={handleWatchClick}
							className="flex-1 py-2.5 px-4 rounded-md bg-surface-elevated border border-surface-border-muted text-text-primary text-sm font-semibold hover:bg-twitch-purple hover:border-twitch-purple transition-all"
						>
							{channel.isLive ? "Watch Live" : "Watch VOD"}
						</button>
						{channel.isLive && (
							<button
								type="button"
								onClick={handleChatClick}
								aria-label={`Open chat for ${channel.displayName}`}
								title="Open Chat"
								className="py-2.5 px-3 rounded-md bg-surface-elevated border border-surface-border-muted text-text-muted hover:text-text-primary hover:bg-twitch-purple hover:border-twitch-purple transition-all"
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

function getThumbnailUrl(channel: Channel): string | null {
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
