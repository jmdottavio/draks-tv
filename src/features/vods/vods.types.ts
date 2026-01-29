import type { cachedVods, vodPlaybackProgress } from "@/src/db/schema";

type CachedVideoSelect = typeof cachedVods.$inferSelect;
type VodPlaybackProgressSelect = typeof vodPlaybackProgress.$inferSelect;

type TwitchUser = {
	id: string;
	login: string;
	display_name: string;
	profile_image_url: string;
};

type TwitchVideo = {
	id: string;
	user_id: string;
	user_name: string;
	title: string;
	duration: string;
	created_at: string;
	thumbnail_url: string;
};

type ChannelCacheInput = {
	channelId: string;
	isLive: boolean;
	lastLiveAt: string | null;
	latestVideoId: number | null;
};

type ChannelCacheWithVideo = {
	channelId: string;
	isLive: boolean;
	lastLiveAt: string | null;
	latestVideoId: number | null;
	updatedAt: string;
	latestVideo: CachedVideoSelect | null;
};

type VodProgressResponse = {
	progress: VodPlaybackProgressSelect | null;
};

type VodProgressBulkResponse = {
	progress: Array<VodPlaybackProgressSelect>;
};

type RecentProgressResponse = {
	progress: Array<VodPlaybackProgressSelect>;
};

export type {
	CachedVideoSelect,
	ChannelCacheInput,
	ChannelCacheWithVideo,
	RecentProgressResponse,
	TwitchUser,
	TwitchVideo,
	VodPlaybackProgressSelect,
	VodProgressBulkResponse,
	VodProgressResponse,
};
