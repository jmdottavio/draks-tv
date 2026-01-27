import { and, desc, eq, notInArray, sql } from "drizzle-orm";

import { database } from "@/src/db";
import { cachedVods, channelCache } from "@/src/db/schema";

import type { VideoInput } from "./vods.types";

function getVideosForChannel(channelId: string, limit: number) {
	try {
		const rows = database
			.select()
			.from(cachedVods)
			.where(eq(cachedVods.channelId, channelId))
			.orderBy(desc(cachedVods.createdAt))
			.limit(limit)
			.all();

		return rows;
	} catch (error) {
		console.error("[vods.repository] getVideosForChannel failed:", error);
		return new Error("Failed to get videos for channel");
	}
}

function upsertVideo(videoData: VideoInput) {
	try {
		const result = database
			.insert(cachedVods)
			.values({
				videoId: videoData.videoId,
				channelId: videoData.channelId,
				title: videoData.title,
				duration: videoData.duration,
				createdAt: videoData.createdAt,
				thumbnailUrl: videoData.thumbnailUrl,
			})
			.onConflictDoUpdate({
				target: cachedVods.videoId,
				set: {
					title: videoData.title,
					duration: videoData.duration,
					createdAt: videoData.createdAt,
					thumbnailUrl: videoData.thumbnailUrl,
					fetchedAt: sql`CURRENT_TIMESTAMP`,
				},
			})
			.returning({ id: cachedVods.id })
			.get();

		if (result === undefined) {
			return new Error("Upsert did not return a row");
		}

		return result.id;
	} catch (error) {
		console.error("[vods.repository] upsertVideo failed:", error);
		return new Error("Failed to upsert video");
	}
}

function deleteOldVideos(channelId: string, keepCount: number) {
	try {
		// Wrap in transaction to prevent race conditions between read and delete
		const deletedCount = database.transaction((transaction) => {
			// Get the latestVideoId from channelCache to protect it from deletion
			const cacheRow = transaction
				.select({ latestVideoId: channelCache.latestVideoId })
				.from(channelCache)
				.where(eq(channelCache.channelId, channelId))
				.get();

			const protectedVideoId = cacheRow?.latestVideoId;

			const videosToKeep = transaction
				.select({ id: cachedVods.id })
				.from(cachedVods)
				.where(eq(cachedVods.channelId, channelId))
				.orderBy(desc(cachedVods.createdAt))
				.limit(keepCount)
				.all();

			const idsToKeep = videosToKeep.map((video) => video.id);

			// Also protect the latestVideoId if it exists and is not already in the keep list
			if (protectedVideoId !== null && protectedVideoId !== undefined) {
				if (!idsToKeep.includes(protectedVideoId)) {
					idsToKeep.push(protectedVideoId);
				}
			}

			if (idsToKeep.length === 0) {
				const deleted = transaction
					.delete(cachedVods)
					.where(eq(cachedVods.channelId, channelId))
					.returning({ id: cachedVods.id })
					.all();

				return deleted.length;
			}

			const deleted = transaction
				.delete(cachedVods)
				.where(
					and(
						eq(cachedVods.channelId, channelId),
						notInArray(cachedVods.id, idsToKeep)
					)
				)
				.returning({ id: cachedVods.id })
				.all();

			return deleted.length;
		});

		return deletedCount;
	} catch (error) {
		console.error("[vods.repository] deleteOldVideos failed:", error);
		return new Error("Failed to delete old videos");
	}
}

export { deleteOldVideos, getVideosForChannel, upsertVideo };
