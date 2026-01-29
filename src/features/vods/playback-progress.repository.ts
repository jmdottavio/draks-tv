import { desc, eq, inArray, sql } from "drizzle-orm";

import { database } from "@/src/db";
import { vodPlaybackProgress } from "@/src/db/schema";

type SaveProgressInput = {
	vodId: string;
	channelId: string;
	channelName: string;
	vodTitle: string;
	positionSeconds: number;
	durationSeconds?: number | undefined;
};

function getPlaybackProgress(vodId: string) {
	try {
		const row = database
			.select()
			.from(vodPlaybackProgress)
			.where(eq(vodPlaybackProgress.vodId, vodId))
			.get();

		return row ?? null;
	} catch (error) {
		console.error("[playback-progress.repository] getPlaybackProgress failed:", error);
		return new Error("Failed to get playback progress");
	}
}

function getPlaybackProgressBulk(vodIds: Array<string>) {
	try {
		if (vodIds.length === 0) {
			return [];
		}

		const rows = database
			.select()
			.from(vodPlaybackProgress)
			.where(inArray(vodPlaybackProgress.vodId, vodIds))
			.all();

		return rows;
	} catch (error) {
		console.error("[playback-progress.repository] getPlaybackProgressBulk failed:", error);
		return new Error("Failed to get playback progress");
	}
}

function savePlaybackProgress(data: SaveProgressInput) {
	try {
		if (data.positionSeconds < 0) {
			return new Error("Position cannot be negative");
		}

		if (data.durationSeconds !== undefined && data.durationSeconds < 0) {
			return new Error("Duration cannot be negative");
		}

		const result = database
			.insert(vodPlaybackProgress)
			.values({
				vodId: data.vodId,
				channelId: data.channelId,
				channelName: data.channelName,
				vodTitle: data.vodTitle,
				positionSeconds: data.positionSeconds,
				durationSeconds: data.durationSeconds ?? null,
			})
			.onConflictDoUpdate({
				target: vodPlaybackProgress.vodId,
				set: {
					positionSeconds: data.positionSeconds,
					durationSeconds: data.durationSeconds ?? null,
					vodTitle: data.vodTitle,
					channelName: data.channelName,
					updatedAt: sql`CURRENT_TIMESTAMP`,
				},
			})
			.returning({ id: vodPlaybackProgress.id })
			.get();

		if (result === undefined) {
			return new Error("Upsert did not return a row");
		}

		return null;
	} catch (error) {
		console.error("[playback-progress.repository] savePlaybackProgress failed:", error);
		return new Error("Failed to save playback progress");
	}
}

function deletePlaybackProgress(vodId: string) {
	try {
		const deleted = database
			.delete(vodPlaybackProgress)
			.where(eq(vodPlaybackProgress.vodId, vodId))
			.returning({ vodId: vodPlaybackProgress.vodId })
			.all();

		return deleted.length > 0;
	} catch (error) {
		console.error("[playback-progress.repository] deletePlaybackProgress failed:", error);
		return new Error("Failed to delete playback progress");
	}
}

function getRecentProgress(limit = 10) {
	try {
		const rows = database
			.select()
			.from(vodPlaybackProgress)
			.orderBy(desc(vodPlaybackProgress.updatedAt))
			.limit(limit)
			.all();

		return rows;
	} catch (error) {
		console.error("[playback-progress.repository] getRecentProgress failed:", error);
		return new Error("Failed to get recent progress");
	}
}

export {
	deletePlaybackProgress,
	getPlaybackProgress,
	getPlaybackProgressBulk,
	getRecentProgress,
	savePlaybackProgress,
};

export type { SaveProgressInput };
