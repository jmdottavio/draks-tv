import type { cachedVods } from "@/src/db/schema";

type CachedVideoSelect = typeof cachedVods.$inferSelect;

interface TwitchUser {
	id: string;
	login: string;
	display_name: string;
	profile_image_url: string;
}

interface TwitchVideo {
	id: string;
	user_id: string;
	user_name: string;
	title: string;
	duration: string;
	created_at: string;
	thumbnail_url: string;
}

interface ChannelCacheInput {
	channelId: string;
	isLive: boolean;
	lastLiveAt: string | null;
	latestVideoId: number | null;
}

interface ChannelCacheWithVideo {
	channelId: string;
	isLive: boolean;
	lastLiveAt: string | null;
	latestVideoId: number | null;
	updatedAt: string;
	latestVideo: CachedVideoSelect | null;
}

export type {
	CachedVideoSelect,
	ChannelCacheInput,
	ChannelCacheWithVideo,
	TwitchUser,
	TwitchVideo,
};
