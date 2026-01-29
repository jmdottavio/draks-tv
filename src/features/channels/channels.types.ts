interface Stream {
	title: string;
	gameName: string;
	viewerCount: number;
	thumbnailUrl: string;
	startedAt: string;
}

interface Vod {
	id: string;
	title: string;
	duration: string;
	createdAt: string;
	thumbnailUrl: string;
}

interface Channel {
	id: string;
	login: string;
	displayName: string;
	profileImage: string;
	isFavorite: boolean;
	isLive: boolean;
	stream: Stream | null;
	latestVod: Vod | null;
}

interface FavoriteInput {
	id: string;
	login: string;
	displayName: string;
	profileImage: string;
}

interface FavoriteOutput {
	id: string;
	login: string;
	displayName: string;
	profileImage: string;
}

export type { Channel, Stream, Vod, FavoriteInput, FavoriteOutput };
