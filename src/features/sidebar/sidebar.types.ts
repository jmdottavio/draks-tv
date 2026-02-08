export type SidebarChannel = {
	id: string;
	channelName: string;
	profileImage: string;
	isLive: boolean;
	isFavorite: boolean;
	viewerCount: number | null;
	lastSeenAt: string | null;
	gameName: string | null;
	streamTitle: string | null;
};
