import type { cachedVods, vodPlaybackProgress } from "@/src/db/schema";

export type CachedVideoSelect = typeof cachedVods.$inferSelect;
export type VodPlaybackProgressSelect = typeof vodPlaybackProgress.$inferSelect;

export type TwitchUser = {
	id: string;
	login: string;
	display_name: string;
	profile_image_url: string;
};

export type TwitchVideo = {
	id: string;
	user_id: string;
	user_name: string;
	title: string;
	duration: string;
	created_at: string;
	thumbnail_url: string;
};

export type ChannelCacheInput = {
	channelId: string;
	isLive: boolean;
	lastLiveAt: string | null;
	latestVideoId: number | null;
};

export type ChannelCacheWithVideo = {
	channelId: string;
	isLive: boolean;
	lastLiveAt: string | null;
	latestVideoId: number | null;
	updatedAt: string;
	latestVideo: CachedVideoSelect | null;
};
