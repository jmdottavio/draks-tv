import { and, desc, eq, gt, inArray, isNotNull, sql } from "drizzle-orm";

import { database } from "@/src/db";
import { vods } from "@/src/db/schema";
import { parseDurationToSeconds } from "@/src/shared/utils/format";

import type { SQL } from "drizzle-orm";
import type { TwitchVideo } from "@/src/services/twitch-service";
import type { SaveProgressInput } from "./vods.types";

export function upsertVodsFromTwitch(videos: Array<TwitchVideo>) {
	try {
		if (videos.length === 0) {
			return null;
		}

		database.transaction((transaction) => {
			for (const video of videos) {
				const durationSeconds = parseDurationToSeconds(video.duration) ?? 0;

				transaction
					.insert(vods)
					.values({
						vodId: video.id,
						channelId: video.userId,
						title: video.title,
						durationSeconds,
						createdAt: video.createdAt,
						thumbnailUrl: video.thumbnailUrl,
						fetchedAt: sql`CURRENT_TIMESTAMP`,
					})
					.onConflictDoUpdate({
						target: vods.vodId,
						set: {
							title: video.title,
							durationSeconds,
							createdAt: video.createdAt,
							thumbnailUrl: video.thumbnailUrl,
							fetchedAt: sql`CURRENT_TIMESTAMP`,
						},
					})
					.run();
			}
		});

		return null;
	} catch (error) {
		console.error("[vods.repository] upsertVodsFromTwitch failed:", error);
		return new Error("Failed to upsert VODs");
	}
}

export function getPlaybackProgress(vodId: string) {
	try {
		const row = database
			.select({
				vodId: vods.vodId,
				playbackPositionSeconds: vods.playbackPositionSeconds,
				durationSeconds: vods.durationSeconds,
				playbackUpdatedAt: vods.playbackUpdatedAt,
			})
			.from(vods)
			.where(eq(vods.vodId, vodId))
			.get();

		return row ?? null;
	} catch (error) {
		console.error("[vods.repository] getPlaybackProgress failed:", error);
		return new Error("Failed to get playback progress");
	}
}

export function getPlaybackProgressBulk(vodIds: Array<string>) {
	try {
		if (vodIds.length === 0) {
			return [];
		}

		const rows = database
			.select({
				vodId: vods.vodId,
				playbackPositionSeconds: vods.playbackPositionSeconds,
				durationSeconds: vods.durationSeconds,
				playbackUpdatedAt: vods.playbackUpdatedAt,
			})
			.from(vods)
			.where(inArray(vods.vodId, vodIds))
			.all();

		return rows;
	} catch (error) {
		console.error("[vods.repository] getPlaybackProgressBulk failed:", error);
		return new Error("Failed to get playback progress");
	}
}

export function savePlaybackProgress(data: SaveProgressInput) {
	try {
		if (data.positionSeconds < 0) {
			return new Error("Position cannot be negative");
		}

		if (data.durationSeconds !== undefined && data.durationSeconds < 0) {
			return new Error("Duration cannot be negative");
		}

		const updateValues: {
			playbackPositionSeconds: number;
			playbackUpdatedAt: SQL<unknown>;
			durationSeconds?: number;
		} = {
			playbackPositionSeconds: data.positionSeconds,
			playbackUpdatedAt: sql`CURRENT_TIMESTAMP`,
		};

		if (data.durationSeconds !== undefined) {
			updateValues.durationSeconds = data.durationSeconds;
		}

		const result = database
			.update(vods)
			.set(updateValues)
			.where(eq(vods.vodId, data.vodId))
			.returning({ vodId: vods.vodId })
			.get();

		if (result === undefined) {
			return new Error("VOD not found");
		}

		return null;
	} catch (error) {
		console.error("[vods.repository] savePlaybackProgress failed:", error);
		return new Error("Failed to save playback progress");
	}
}

export function deletePlaybackProgress(vodId: string) {
	try {
		const deleted = database
			.update(vods)
			.set({
				playbackPositionSeconds: 0,
				playbackUpdatedAt: null,
			})
			.where(eq(vods.vodId, vodId))
			.returning({ vodId: vods.vodId })
			.all();

		return deleted.length > 0;
	} catch (error) {
		console.error("[vods.repository] deletePlaybackProgress failed:", error);
		return new Error("Failed to delete playback progress");
	}
}

export function getRecentProgress(limit = 10) {
	try {
		const rows = database
			.select({
				vodId: vods.vodId,
				playbackPositionSeconds: vods.playbackPositionSeconds,
				durationSeconds: vods.durationSeconds,
				playbackUpdatedAt: vods.playbackUpdatedAt,
			})
			.from(vods)
			.where(and(gt(vods.playbackPositionSeconds, 0), isNotNull(vods.playbackUpdatedAt)))
			.orderBy(desc(vods.playbackUpdatedAt))
			.limit(limit)
			.all();

		return rows;
	} catch (error) {
		console.error("[vods.repository] getRecentProgress failed:", error);
		return new Error("Failed to get recent progress");
	}
}
