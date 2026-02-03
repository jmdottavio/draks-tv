export type Stream = {
	title: string;
	gameName: string;
	viewerCount: number;
	thumbnailUrl: string;
	startedAt: string;
};

export type Vod = {
	id: string;
	title: string;
	durationSeconds: number;
	createdAt: string;
	thumbnailUrl: string;
};

export type Channel = {
	id: string;
	channelName: string;
	profileImage: string;
	isFavorite: boolean;
	isLive: boolean;
	stream: Stream | null;
	latestVod: Vod | null;
};

export type FavoriteInput = {
	id: string;
	channelName: string;
	profileImage: string;
};

export type FavoriteOutput = {
	id: string;
	channelName: string;
	profileImage: string;
};
