import { isRecord } from "@/src/shared/utils/validation";

import type { ChannelSearchResponse, VodProgressSelect } from "./vods.types";
import type { TwitchChannel, TwitchVideo } from "@/src/services/twitch-service";

function isTwitchChannel(value: unknown): value is TwitchChannel {
	if (!isRecord(value)) {
		return false;
	}

	return (
		typeof value.id === "string" &&
		typeof value.login === "string" &&
		typeof value.displayName === "string" &&
		typeof value.profileImageUrl === "string"
	);
}

function isTwitchVideo(value: unknown): value is TwitchVideo {
	if (!isRecord(value)) {
		return false;
	}

	return (
		typeof value.id === "string" &&
		typeof value.userId === "string" &&
		typeof value.userName === "string" &&
		typeof value.title === "string" &&
		typeof value.duration === "string" &&
		typeof value.createdAt === "string" &&
		typeof value.thumbnailUrl === "string"
	);
}

function isVodProgressSelect(value: unknown): value is VodProgressSelect {
	if (!isRecord(value)) {
		return false;
	}

	const playbackUpdatedAt = value.playbackUpdatedAt;
	const playbackUpdatedAtValid =
		playbackUpdatedAt === null || typeof playbackUpdatedAt === "string";

	return (
		typeof value.vodId === "string" &&
		typeof value.playbackPositionSeconds === "number" &&
		typeof value.durationSeconds === "number" &&
		playbackUpdatedAtValid
	);
}

export function parseChannelSearchResponse(data: unknown): ChannelSearchResponse | Error {
	if (!isRecord(data)) {
		return new Error("Invalid channel search response");
	}

	if (!isTwitchChannel(data.channel)) {
		return new Error("Invalid channel search response");
	}

	if (!Array.isArray(data.videos)) {
		return new Error("Invalid channel search response");
	}

	const videos: Array<TwitchVideo> = [];
	for (const video of data.videos) {
		if (!isTwitchVideo(video)) {
			return new Error("Invalid channel search response");
		}
		videos.push(video);
	}

	return { channel: data.channel, videos };
}

export function parseVodProgressResponse(data: unknown): Array<VodProgressSelect> | Error {
	if (!isRecord(data) || !Array.isArray(data.progress)) {
		return new Error("Invalid VOD progress response");
	}

	const progress: Array<VodProgressSelect> = [];
	for (const item of data.progress) {
		if (!isVodProgressSelect(item)) {
			return new Error("Invalid VOD progress response");
		}
		progress.push(item);
	}

	return progress;
}

export function parseSaveProgressBody(body: unknown) {
	if (!isRecord(body)) {
		return new Error("Invalid request body");
	}

	if (!("vodId" in body) || typeof body.vodId !== "string") {
		return new Error("Missing or invalid vodId");
	}

	if (!("positionSeconds" in body) || typeof body.positionSeconds !== "number") {
		return new Error("Missing or invalid positionSeconds");
	}

	const durationSeconds =
		"durationSeconds" in body && typeof body.durationSeconds === "number"
			? body.durationSeconds
			: undefined;

	return {
		vodId: body.vodId,
		positionSeconds: body.positionSeconds,
		durationSeconds,
	};
}
