import { isRecord } from "@/src/shared/utils/validation";

import type { SidebarChannel } from "./sidebar.types";

export function isSidebarChannel(value: unknown): value is SidebarChannel {
	if (!isRecord(value)) {
		return false;
	}

	const viewerCount = value.viewerCount;
	const lastSeenAt = value.lastSeenAt;
	const gameName = value.gameName;
	const streamTitle = value.streamTitle;

	const viewerCountValid = viewerCount === null || typeof viewerCount === "number";
	const lastSeenAtValid = lastSeenAt === null || typeof lastSeenAt === "string";
	const gameNameValid = gameName === null || typeof gameName === "string";
	const streamTitleValid = streamTitle === null || typeof streamTitle === "string";

	return (
		typeof value.id === "string" &&
		typeof value.channelName === "string" &&
		typeof value.profileImage === "string" &&
		typeof value.isLive === "boolean" &&
		typeof value.isFavorite === "boolean" &&
		viewerCountValid &&
		lastSeenAtValid &&
		gameNameValid &&
		streamTitleValid
	);
}

export function isSidebarChannelArray(value: unknown): value is Array<SidebarChannel> {
	if (!Array.isArray(value)) {
		return false;
	}

	for (const item of value) {
		if (!isSidebarChannel(item)) {
			return false;
		}
	}

	return true;
}
