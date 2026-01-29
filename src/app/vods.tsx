import { memo, useCallback, useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";

import { watchVod } from "@/src/features/vods/api/vods-mutations";
import { useSaveProgress, useVodProgressBulk } from "@/src/features/vods/hooks/use-vod-progress";
import { useVodSearch } from "@/src/features/vods/hooks/use-vods";
import { ArrowLeftIcon, SearchIcon } from "@/src/shared/components/icons";
import {
	formatDate,
	formatDuration,
	formatSecondsToTime,
	formatThumbnail,
	parseDurationToSeconds,
	parseTimeToSeconds,
} from "@/src/shared/utils/format";

import type { SaveProgressInput } from "@/src/features/vods/playback-progress.repository";
import type { TwitchVideo, VodPlaybackProgressSelect } from "@/src/features/vods/vods.types";

export const Route = createFileRoute("/vods")({
	component: VodsPage,
});

function VodsPage() {
	const [searchInput, setSearchInput] = useState("");
	const [searchQuery, setSearchQuery] = useState<string | null>(null);

	const { data, isLoading, error } = useVodSearch(searchQuery);

	const vodIds = data?.videos.map((video) => video.id) ?? [];
	const { data: progressData } = useVodProgressBulk(vodIds);

	const progressMap = useMemo(() => {
		const map = new Map<string, VodPlaybackProgressSelect>();
		if (progressData !== undefined) {
			for (const item of progressData) {
				map.set(item.vodId, item);
			}
		}
		return map;
	}, [progressData]);

	const saveProgressMutation = useSaveProgress();

	function handleSearch(event: React.FormEvent) {
		event.preventDefault();
		const trimmed = searchInput.trim();

		if (trimmed !== "") {
			setSearchQuery(trimmed);
		}
	}

	const handleWatchVod = useCallback((vodId: string, startTimeSeconds?: number) => {
		watchVod(vodId, startTimeSeconds).catch((watchError: unknown) => {
			console.error("Failed to launch VOD:", watchError);
		});
	}, []);

	const handleSaveProgress = useCallback(
		(input: SaveProgressInput) => {
			saveProgressMutation.mutate(input);
		},
		[saveProgressMutation],
	);

	return (
		<section className="animate-[fadeIn_0.2s_ease]">
			<div className="mb-5 flex items-center gap-4">
				<Link
					to="/"
					className="flex items-center gap-2 rounded-md px-4 py-2.5 text-sm font-semibold text-text-muted transition-all hover:bg-surface-elevated hover:text-text-primary"
				>
					<ArrowLeftIcon className="h-4 w-4" />
					Back
				</Link>
				<h2 className="text-xl font-semibold">Search VODs</h2>
			</div>

			<form
				onSubmit={handleSearch}
				className="mb-6 flex max-w-[600px] items-center gap-3 rounded-lg border border-surface-border-muted bg-surface-card px-4 py-1"
			>
				<SearchIcon className="h-5 w-5 flex-shrink-0 text-text-dim" />
				<input
					type="text"
					value={searchInput}
					onChange={(event) => setSearchInput(event.target.value)}
					placeholder="Enter channel name..."
					aria-label="Search channel name"
					className="flex-1 border-none bg-transparent py-2.5 text-sm text-text-primary placeholder:text-text-dim focus:outline-none"
					autoFocus
				/>
				<button
					type="submit"
					className="flex-shrink-0 rounded-md bg-twitch-purple px-4 py-2.5 text-sm font-semibold text-white transition-all hover:bg-twitch-purple-hover"
				>
					Search
				</button>
			</form>

			{isLoading && (
				<div className="flex items-center justify-center py-16 text-text-dim">
					<span>Searching</span>
					<span className="ml-3 h-6 w-6 animate-spin rounded-full border-2 border-surface-border-muted border-t-twitch-purple" />
				</div>
			)}

			{error !== null && <p className="text-sm text-live">{error.message}</p>}

			{data !== null && data !== undefined && (
				<div className="grid grid-cols-[repeat(auto-fill,minmax(320px,1fr))] gap-4">
					{data.videos.map((vod) => (
						<VodCard
							key={vod.id}
							vod={vod}
							progress={progressMap.get(vod.id) ?? null}
							channelId={data.user.id}
							channelName={data.user.display_name}
							onWatch={handleWatchVod}
							onSaveProgress={handleSaveProgress}
						/>
					))}
				</div>
			)}

			{data !== null && data !== undefined && data.videos.length === 0 && (
				<p className="text-sm text-text-dim">No VODs found for {searchQuery}</p>
			)}
		</section>
	);
}

type VodCardProps = {
	vod: TwitchVideo;
	progress: VodPlaybackProgressSelect | null;
	channelId: string;
	channelName: string;
	onWatch: (id: string, startTimeSeconds?: number) => void;
	onSaveProgress: (data: SaveProgressInput) => void;
};

const VodCard = memo(function VodCard({
	vod,
	progress,
	channelId,
	channelName,
	onWatch,
	onSaveProgress,
}: VodCardProps) {
	const [showSaveInput, setShowSaveInput] = useState(false);
	const [saveInputValue, setSaveInputValue] = useState("");

	const thumbnailUrl = formatThumbnail(vod.thumbnail_url, 440, 248);

	const hasProgress = progress !== null;
	const durationSeconds = parseDurationToSeconds(vod.duration);
	const progressPercent =
		hasProgress && durationSeconds !== null && durationSeconds > 0
			? (progress.positionSeconds / durationSeconds) * 100
			: 0;

	function handleWatchClick() {
		onWatch(vod.id);
	}

	function handleResumeClick() {
		if (hasProgress) {
			onWatch(vod.id, progress.positionSeconds);
		}
	}

	function handleSaveProgressClick() {
		setShowSaveInput(true);
		if (hasProgress) {
			setSaveInputValue(formatSecondsToTime(progress.positionSeconds));
		}
	}

	function handleSaveProgressSubmit(event: React.FormEvent) {
		event.preventDefault();
		const seconds = parseTimeToSeconds(saveInputValue);

		if (seconds === null || seconds < 0) {
			return;
		}

		onSaveProgress({
			vodId: vod.id,
			channelId: channelId,
			channelName: channelName,
			vodTitle: vod.title,
			positionSeconds: seconds,
			durationSeconds: durationSeconds ?? undefined,
		});

		setShowSaveInput(false);
		setSaveInputValue("");
	}

	function handleCancelSave() {
		setShowSaveInput(false);
		setSaveInputValue("");
	}

	return (
		<div className="overflow-hidden rounded-lg border border-surface-border-muted bg-surface-card transition-all hover:-translate-y-0.5 hover:border-surface-border">
			<div className="relative aspect-video bg-surface-elevated">
				<img src={thumbnailUrl} alt={vod.title} className="h-full w-full object-cover" />
				<span className="absolute bottom-2 right-2 rounded bg-black/80 px-2 py-1 text-sm font-medium text-white">
					{formatDuration(vod.duration)}
				</span>
				{/* Progress bar - always reserve space to prevent CLS */}
				<div className="absolute bottom-0 left-0 right-0 h-1 bg-black/50">
					<div
						className="h-full bg-twitch-purple transition-all"
						style={{ width: `${progressPercent}%` }}
					/>
				</div>
			</div>

			<div className="p-4">
				<div className="mb-2 line-clamp-2 text-sm text-text-primary" title={vod.title}>
					{vod.title}
				</div>
				<div className="mb-2 flex items-center gap-3 text-sm text-text-muted">
					<span className="font-semibold text-twitch-purple-light">{vod.user_name}</span>
					<span>{formatDate(vod.created_at)}</span>
				</div>

				{hasProgress && (
					<div className="mb-3 text-xs text-text-muted">
						Watched {formatSecondsToTime(progress.positionSeconds)}
						{durationSeconds !== null && ` / ${formatSecondsToTime(durationSeconds)}`}
					</div>
				)}

				{showSaveInput && (
					<form onSubmit={handleSaveProgressSubmit} className="mb-3">
						<label
							htmlFor={`progress-input-${vod.id}`}
							className="mb-1 block text-xs text-text-muted"
						>
							Enter timestamp (H:MM:SS or MM:SS)
						</label>
						<div className="flex gap-2">
							<input
								id={`progress-input-${vod.id}`}
								type="text"
								value={saveInputValue}
								onChange={(event) => setSaveInputValue(event.target.value)}
								placeholder="1:30:00"
								className="flex-1 rounded border border-surface-border-muted bg-surface-elevated px-2 py-1.5 text-sm text-text-primary placeholder:text-text-dim focus:border-twitch-purple focus:outline-none"
								autoFocus
							/>
							<button
								type="submit"
								className="rounded bg-twitch-purple px-3 py-1.5 text-xs font-semibold text-white transition-all hover:bg-twitch-purple-hover"
							>
								Save
							</button>
							<button
								type="button"
								onClick={handleCancelSave}
								className="rounded border border-surface-border-muted bg-surface-elevated px-3 py-1.5 text-xs font-semibold text-text-muted transition-all hover:text-text-primary"
							>
								Cancel
							</button>
						</div>
					</form>
				)}

				<div className="flex flex-wrap gap-2">
					{hasProgress && (
						<button
							onClick={handleResumeClick}
							className="flex-1 rounded-md bg-twitch-purple px-4 py-2.5 text-sm font-semibold text-white transition-all hover:bg-twitch-purple-hover"
						>
							Resume
						</button>
					)}
					<button
						onClick={handleWatchClick}
						className="flex-1 rounded-md border border-surface-border-muted bg-surface-elevated px-4 py-2.5 text-sm font-semibold text-text-primary transition-all hover:border-twitch-purple hover:bg-twitch-purple"
					>
						{hasProgress ? "Start Over" : "Watch in VLC"}
					</button>
					{!showSaveInput && (
						<button
							onClick={handleSaveProgressClick}
							className="rounded-md border border-surface-border-muted bg-surface-elevated px-3 py-2.5 text-sm font-semibold text-text-muted transition-all hover:border-twitch-purple hover:text-text-primary"
							title="Save progress"
						>
							{hasProgress ? "Update" : "Save"}
						</button>
					)}
				</div>
			</div>
		</div>
	);
});
