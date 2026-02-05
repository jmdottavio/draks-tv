import type { vods } from "@/src/db/schema";
import type { TwitchChannel, TwitchVideo } from "@/src/services/twitch-service";

export type VodSelect = typeof vods.$inferSelect;

export type VodProgressSelect = {
	vodId: string;
	playbackPositionSeconds: number;
	durationSeconds: number;
	playbackUpdatedAt: string | null;
};

export type VodSummary = {
	id: string;
	title: string;
	durationSeconds: number;
	createdAt: string;
	thumbnailUrl: string;
};

export type SaveProgressInput = {
	vodId: string;
	positionSeconds: number;
	durationSeconds?: number | undefined;
};

export type ChannelSearchResponse = {
	channel: TwitchChannel;
	videos: Array<TwitchVideo>;
};
