type Stream = {
	title: string;
	gameName: string;
	viewerCount: number;
	thumbnailUrl: string;
	startedAt: string;
};

type Vod = {
	id: string;
	title: string;
	duration: string;
	createdAt: string;
	thumbnailUrl: string;
};

type Channel = {
	id: string;
	login: string;
	displayName: string;
	profileImage: string;
	isFavorite: boolean;
	isLive: boolean;
	stream: Stream | null;
	latestVod: Vod | null;
};

type FavoriteInput = {
	id: string;
	login: string;
	displayName: string;
	profileImage: string;
};

type FavoriteOutput = {
	id: string;
	login: string;
	displayName: string;
	profileImage: string;
};

export type { Channel, Stream, Vod, FavoriteInput, FavoriteOutput };
