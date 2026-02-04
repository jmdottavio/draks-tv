import { memo, useState } from "react";

import {
	formatDate,
	formatSecondsToTime,
	formatThumbnail,
	parseTimeToSeconds,
} from "@/src/shared/utils/format";

import type { SaveProgressInput, VodProgressSelect } from "@/src/features/vods/vods.types";

type VodCardData = {
	id: string;
	title: string;
	channelName: string;
	createdAt: string;
	durationSeconds: number | null;
	durationLabel: string;
	thumbnailUrl: string;
};

type VodCardProps = {
	vod: VodCardData;
	progress: VodProgressSelect | null;
	onWatch: (id: string, startTimeSeconds?: number) => void;
	onSaveProgress: (data: SaveProgressInput) => void;
	showOfflineBadge?: boolean;
};

const VodCard = memo(function VodCard({
	vod,
	progress,
	onWatch,
	onSaveProgress,
	showOfflineBadge = false,
}: VodCardProps) {
	const [showSaveInput, setShowSaveInput] = useState(false);
	const [saveInputValue, setSaveInputValue] = useState("");

	const thumbnailUrl = formatThumbnail(vod.thumbnailUrl, 440, 248);
	const hasProgress = progress !== null;
	let progressPercent = 0;
	if (hasProgress && vod.durationSeconds !== null && vod.durationSeconds > 0) {
		progressPercent = (progress.playbackPositionSeconds / vod.durationSeconds) * 100;
	}

	let watchButtonLabel = "Watch in VLC";
	if (hasProgress && progressPercent > 0) {
		watchButtonLabel = "Start Over";
	}

	let saveButtonLabel = "Save";
	if (hasProgress) {
		saveButtonLabel = "Update";
	}

	function handleWatchClick() {
		onWatch(vod.id);
	}

	function handleResumeClick() {
		if (hasProgress) {
			onWatch(vod.id, progress.playbackPositionSeconds);
		}
	}

	function handleSaveProgressClick() {
		setShowSaveInput(true);
		if (hasProgress) {
			setSaveInputValue(formatSecondsToTime(progress.playbackPositionSeconds));
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
			positionSeconds: seconds,
			durationSeconds: vod.durationSeconds ?? undefined,
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
				<img
					src={thumbnailUrl}
					alt={vod.title}
					className="h-full w-full object-cover"
					onError={(event) => {
						const img = event.currentTarget;
						img.style.display = "none";
					}}
				/>
				{showOfflineBadge && (
					<div className="absolute inset-0 bg-black/50 flex items-center justify-center">
						<span className="bg-black/70 text-text-secondary text-sm font-semibold px-3 py-1.5 rounded uppercase">
							Offline
						</span>
					</div>
				)}
				<span className="absolute bottom-2 right-2 rounded bg-black/80 px-2 py-1 text-sm font-medium text-white">
					{vod.durationLabel}
				</span>
				<div className="absolute bottom-0 left-0 right-0 h-1 bg-black/50">
					<div
						className="h-full bg-twitch-purple transition-all"
						style={{ width: `${progressPercent}%` }}
					/>
				</div>
			</div>

			<div className="p-4">
				<div
					className="mb-2 line-clamp-2 min-h-[2.5rem] text-sm text-text-primary"
					title={vod.title}
				>
					{vod.title}
				</div>
				<div className="mb-2 flex items-center gap-3 text-sm text-text-muted">
					<span className="font-semibold text-twitch-purple-light">
						{vod.channelName}
					</span>
					<span>{formatDate(vod.createdAt)}</span>
				</div>

				{hasProgress && (
					<div className="mb-3 text-xs text-text-muted">
						Watched {formatSecondsToTime(progress.playbackPositionSeconds)}
						{vod.durationSeconds !== null &&
							` / ${formatSecondsToTime(vod.durationSeconds)}`}
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
					{hasProgress && progressPercent > 0 && (
						<button
							type="button"
							onClick={handleResumeClick}
							className="flex-1 rounded-md bg-twitch-purple px-4 py-2.5 text-sm font-semibold text-white transition-all hover:bg-twitch-purple-hover"
						>
							Resume
						</button>
					)}
					<button
						type="button"
						onClick={handleWatchClick}
						className="flex-1 rounded-md border border-surface-border-muted bg-surface-elevated px-4 py-2.5 text-sm font-semibold text-text-primary transition-all hover:border-twitch-purple hover:bg-twitch-purple"
					>
						{watchButtonLabel}
					</button>
					{!showSaveInput && (
						<button
							type="button"
							onClick={handleSaveProgressClick}
							className="rounded-md border border-surface-border-muted bg-surface-elevated px-3 py-2.5 text-sm font-semibold text-text-muted transition-all hover:border-twitch-purple hover:text-text-primary"
							title="Save progress"
						>
							{saveButtonLabel}
						</button>
					)}
				</div>
			</div>
		</div>
	);
});

export { VodCard };
export type { VodCardData };
