import type { VodSummary } from "@/src/features/vods/vods.types";

export type Stream = {
	title: string;
	gameName: string;
	viewerCount: number;
	thumbnailUrl: string;
	startedAt: string;
};

export type Channel = {
	id: string;
	channelName: string;
	profileImage: string;
	isFavorite: boolean;
	isLive: boolean;
	stream: Stream | null;
	latestVod: VodSummary | null;
};

export type FavoriteInput = {
	id: string;
};
