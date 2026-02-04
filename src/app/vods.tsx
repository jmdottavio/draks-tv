import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useMemo, useState } from "react";

import { watchVod } from "@/src/features/vods/api/vods-mutations";
import { VodCard } from "@/src/features/vods/components/vod-card";
import { useSaveVodProgress, useVodProgressBulk } from "@/src/features/vods/hooks/use-vod-progress";
import { useVodSearch } from "@/src/features/vods/hooks/use-vods";
import { ArrowLeftIcon, SearchIcon } from "@/src/shared/components/icons";
import { formatDuration, parseDurationToSeconds } from "@/src/shared/utils/format";

import type { VodCardData } from "@/src/features/vods/components/vod-card";
import type { VodProgressSelect } from "@/src/features/vods/vods.types";
import type { TwitchVideo } from "@/src/services/twitch-service";

export const Route = createFileRoute("/vods")({
	component: VodsPage,
});

const EMPTY_VOD_IDS: Array<string> = [];

function getVodCardData(vod: TwitchVideo): VodCardData {
	return {
		id: vod.id,
		title: vod.title,
		channelName: vod.userName,
		createdAt: vod.createdAt,
		durationSeconds: parseDurationToSeconds(vod.duration),
		durationLabel: formatDuration(vod.duration),
		thumbnailUrl: vod.thumbnailUrl,
	};
}

function VodsPage() {
	const [searchInput, setSearchInput] = useState("");
	const [searchQuery, setSearchQuery] = useState<string | null>(null);

	const saveProgressMutation = useSaveVodProgress();

	const { data: vodSearchData, isLoading, error } = useVodSearch(searchQuery);

	const vodIds = useMemo(() => {
		if (!vodSearchData || vodSearchData.videos.length === 0) {
			return EMPTY_VOD_IDS;
		}

		return vodSearchData.videos.map((video) => video.id);
	}, [vodSearchData]);

	const { data: progressData } = useVodProgressBulk(vodIds);

	const vodProgressMap = useMemo(() => {
		const map = new Map<string, VodProgressSelect>();

		for (const item of progressData) {
			map.set(item.vodId, item);
		}

		return map;
	}, [progressData]);

	function handleSearch(event: React.FormEvent) {
		event.preventDefault();
		const trimmed = searchInput.trim();

		if (trimmed !== "") {
			setSearchQuery(trimmed);
		}
	}

	const handleWatchVod = useCallback((vodId: string, startTimeSeconds?: number) => {
		if (startTimeSeconds === undefined) {
			watchVod({ id: vodId }).catch((watchError: unknown) => {
				console.error("Failed to launch VOD:", watchError);
			});
			return;
		}
		watchVod({ id: vodId, startTimeSeconds }).catch((watchError: unknown) => {
			console.error("Failed to launch VOD:", watchError);
		});
	}, []);

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

			{vodSearchData !== null && (
				<div className="grid grid-cols-[repeat(auto-fill,minmax(320px,1fr))] gap-4">
					{vodSearchData.videos.map((vod) => (
						<VodCard
							key={vod.id}
							vod={getVodCardData(vod)}
							progress={vodProgressMap.get(vod.id) ?? null}
							onWatch={handleWatchVod}
							onSaveProgress={saveProgressMutation.mutate}
							showOfflineBadge={false}
						/>
					))}
				</div>
			)}

			{vodSearchData !== null && vodSearchData.videos.length === 0 && (
				<p className="text-sm text-text-dim">No VODs found for {searchQuery}</p>
			)}
		</section>
	);
}
