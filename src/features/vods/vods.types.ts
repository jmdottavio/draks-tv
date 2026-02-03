import type { vods } from "@/src/db/schema";

export type VodSelect = typeof vods.$inferSelect;

export type VodProgressSelect = {
	vodId: string;
	playbackPositionSeconds: number;
	durationSeconds: number;
	playbackUpdatedAt: string | null;
};

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
