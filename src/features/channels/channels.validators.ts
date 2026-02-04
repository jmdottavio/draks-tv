import { isRecord } from "@/src/shared/utils/validation";

import type { Channel, Stream } from "./channels.types";
import type { VodSummary } from "@/src/features/vods/vods.types";

const MAX_ID_LENGTH = 50;
const MAX_ORDERED_IDS_COUNT = 1000;

export function isStream(value: unknown): value is Stream {
	if (!isRecord(value)) {
		return false;
	}

	return (
		typeof value.title === "string" &&
		typeof value.gameName === "string" &&
		typeof value.viewerCount === "number" &&
		typeof value.thumbnailUrl === "string" &&
		typeof value.startedAt === "string"
	);
}

export function isVodSummary(value: unknown): value is VodSummary {
	if (!isRecord(value)) {
		return false;
	}

	return (
		typeof value.id === "string" &&
		typeof value.title === "string" &&
		typeof value.durationSeconds === "number" &&
		typeof value.createdAt === "string" &&
		typeof value.thumbnailUrl === "string"
	);
}

export function isChannel(value: unknown): value is Channel {
	if (!isRecord(value)) {
		return false;
	}

	const stream = value.stream;
	const latestVod = value.latestVod;

	if (stream === undefined || latestVod === undefined) {
		return false;
	}

	if (stream !== null && !isStream(stream)) {
		return false;
	}

	if (latestVod !== null && !isVodSummary(latestVod)) {
		return false;
	}

	return (
		typeof value.id === "string" &&
		typeof value.channelName === "string" &&
		typeof value.profileImage === "string" &&
		typeof value.isFavorite === "boolean" &&
		typeof value.isLive === "boolean"
	);
}

export function isChannelArray(value: unknown): value is Array<Channel> {
	if (!Array.isArray(value)) {
		return false;
	}

	for (const item of value) {
		if (!isChannel(item)) {
			return false;
		}
	}

	return true;
}

export function validateAddFavoriteRequest(body: unknown) {
	if (!isRecord(body)) {
		return new Error("Request body must be an object");
	}

	if (typeof body.id !== "string" || body.id.length === 0) {
		return new Error("id is required and must be a non-empty string");
	}

	if (body.id.length > MAX_ID_LENGTH) {
		return new Error(`id must not exceed ${MAX_ID_LENGTH} characters`);
	}

	return {
		id: body.id,
	};
}

export function validateReorderFavoritesRequest(body: unknown) {
	if (!isRecord(body)) {
		return new Error("Request body must be an object");
	}

	if (!Array.isArray(body.orderedIds)) {
		return new Error("orderedIds is required and must be an array");
	}

	if (body.orderedIds.length > MAX_ORDERED_IDS_COUNT) {
		return new Error(`orderedIds must not exceed ${MAX_ORDERED_IDS_COUNT} items`);
	}

	const orderedIds: Array<string> = [];
	for (const id of body.orderedIds) {
		if (typeof id !== "string") {
			return new Error("orderedIds must be an array of strings");
		}

		if (id.length > MAX_ID_LENGTH) {
			return new Error(`each id in orderedIds must not exceed ${MAX_ID_LENGTH} characters`);
		}

		orderedIds.push(id);
	}

	return {
		orderedIds,
	};
}
