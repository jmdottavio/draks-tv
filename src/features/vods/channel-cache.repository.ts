import { and, eq, inArray, notInArray, sql } from "drizzle-orm";

import { database } from "@/src/db";
import { cachedVods, channelCache } from "@/src/db/schema";

import type { SQL } from "drizzle-orm";
import type { CachedVideoSelect } from "@/src/db/schema";
import type { ChannelCacheInput, ChannelCacheWithVideo } from "./vods.types";

function getChannelCache(channelId: string) {
	try {
		const row = database
			.select({
				channelId: channelCache.channelId,
				isLive: channelCache.isLive,
				lastLiveAt: channelCache.lastLiveAt,
				latestVideoId: channelCache.latestVideoId,
				updatedAt: channelCache.updatedAt,
				latestVideo: {
					id: cachedVods.id,
					videoId: cachedVods.videoId,
					channelId: cachedVods.channelId,
					title: cachedVods.title,
					duration: cachedVods.duration,
					createdAt: cachedVods.createdAt,
					thumbnailUrl: cachedVods.thumbnailUrl,
					fetchedAt: cachedVods.fetchedAt,
				},
			})
			.from(channelCache)
			.leftJoin(cachedVods, eq(channelCache.latestVideoId, cachedVods.id))
			.where(eq(channelCache.channelId, channelId))
			.get();

		if (row === undefined) {
			return null;
		}

		// When id is not null, all other fields are guaranteed non-null due to LEFT JOIN semantics
		// Type assertion needed because TypeScript cannot verify this SQL semantic
		const result: ChannelCacheWithVideo = {
			channelId: row.channelId,
			isLive: row.isLive,
			lastLiveAt: row.lastLiveAt,
			latestVideoId: row.latestVideoId,
			updatedAt: row.updatedAt,
			latestVideo:
				row.latestVideo?.id !== null
					? (row.latestVideo as CachedVideoSelect)
					: null,
		};

		return result;
	} catch (error) {
		console.error("[channel-cache.repository] getChannelCache failed:", error);
		return new Error("Failed to get channel cache");
	}
}

function getChannelCacheBulk(channelIds: Array<string>) {
	try {
		if (channelIds.length === 0) {
			return [];
		}

		const rows = database
			.select({
				channelId: channelCache.channelId,
				isLive: channelCache.isLive,
				lastLiveAt: channelCache.lastLiveAt,
				latestVideoId: channelCache.latestVideoId,
				updatedAt: channelCache.updatedAt,
				latestVideo: {
					id: cachedVods.id,
					videoId: cachedVods.videoId,
					channelId: cachedVods.channelId,
					title: cachedVods.title,
					duration: cachedVods.duration,
					createdAt: cachedVods.createdAt,
					thumbnailUrl: cachedVods.thumbnailUrl,
					fetchedAt: cachedVods.fetchedAt,
				},
			})
			.from(channelCache)
			.leftJoin(cachedVods, eq(channelCache.latestVideoId, cachedVods.id))
			.where(inArray(channelCache.channelId, channelIds))
			.all();

		// When id is not null, all other fields are guaranteed non-null due to LEFT JOIN semantics
		// Type assertion needed because TypeScript cannot verify this SQL semantic
		const results: Array<ChannelCacheWithVideo> = rows.map((row) => ({
			channelId: row.channelId,
			isLive: row.isLive,
			lastLiveAt: row.lastLiveAt,
			latestVideoId: row.latestVideoId,
			updatedAt: row.updatedAt,
			latestVideo:
				row.latestVideo?.id !== null
					? (row.latestVideo as CachedVideoSelect)
					: null,
		}));

		return results;
	} catch (error) {
		console.error("[channel-cache.repository] getChannelCacheBulk failed:", error);
		return new Error("Failed to get channel caches in bulk");
	}
}

function getAllChannelCaches() {
	try {
		const rows = database
			.select({
				channelId: channelCache.channelId,
				isLive: channelCache.isLive,
				lastLiveAt: channelCache.lastLiveAt,
				latestVideoId: channelCache.latestVideoId,
				updatedAt: channelCache.updatedAt,
			})
			.from(channelCache)
			.all();

		return rows;
	} catch (error) {
		console.error("[channel-cache.repository] getAllChannelCaches failed:", error);
		return new Error("Failed to get all channel caches");
	}
}

function upsertChannelCache(cacheData: ChannelCacheInput) {
	try {
		const result = database
			.insert(channelCache)
			.values({
				channelId: cacheData.channelId,
				isLive: cacheData.isLive,
				lastLiveAt: cacheData.lastLiveAt,
				latestVideoId: cacheData.latestVideoId,
			})
			.onConflictDoUpdate({
				target: channelCache.channelId,
				set: {
					isLive: cacheData.isLive,
					lastLiveAt: cacheData.lastLiveAt,
					latestVideoId: cacheData.latestVideoId,
					updatedAt: sql`CURRENT_TIMESTAMP`,
				},
			})
			.returning({ channelId: channelCache.channelId })
			.get();

		if (result === undefined) {
			return new Error("Upsert did not return a row");
		}

		return null;
	} catch (error) {
		console.error("[channel-cache.repository] upsertChannelCache failed:", error);
		return new Error("Failed to upsert channel cache");
	}
}

function updateChannelLiveState(channelId: string, isLive: boolean, lastLiveAt?: string) {
	try {
		const setValues: {
			isLive: boolean;
			updatedAt: SQL<unknown>;
			lastLiveAt?: string;
		} = {
			isLive: isLive,
			updatedAt: sql`CURRENT_TIMESTAMP`,
		};

		if (lastLiveAt !== undefined) {
			setValues.lastLiveAt = lastLiveAt;
		}

		const result = database
			.insert(channelCache)
			.values({
				channelId: channelId,
				isLive: isLive,
				lastLiveAt: lastLiveAt ?? null,
			})
			.onConflictDoUpdate({
				target: channelCache.channelId,
				set: setValues,
			})
			.returning({ channelId: channelCache.channelId })
			.get();

		if (result === undefined) {
			return new Error("Upsert did not return a row");
		}

		return null;
	} catch (error) {
		console.error("[channel-cache.repository] updateChannelLiveState failed:", error);
		return new Error("Failed to update channel live state");
	}
}

function updateLatestVideoId(channelId: string, latestVideoId: number) {
	try {
		// Only update existing records - do not create new ones with potentially wrong isLive state
		// No-op if channel cache doesn't exist (caller should use upsertChannelCache instead)
		database
			.update(channelCache)
			.set({
				latestVideoId: latestVideoId,
				updatedAt: sql`CURRENT_TIMESTAMP`,
			})
			.where(eq(channelCache.channelId, channelId))
			.run();

		return null;
	} catch (error) {
		console.error("[channel-cache.repository] updateLatestVideoId failed:", error);
		return new Error("Failed to update latest video ID");
	}
}

function processLiveStateChangesAtomic(currentlyLiveChannelIds: Array<string>) {
	try {
		// Wrap in transaction to ensure both updates happen atomically
		return database.transaction((transaction) => {
			// Build the condition for channels not in the live list
			let notInLiveChannelsCondition: SQL<unknown> = sql`1=1`;
			if (currentlyLiveChannelIds.length > 0) {
				notInLiveChannelsCondition = notInArray(
					channelCache.channelId,
					currentlyLiveChannelIds
				);
			}

			// Atomic update: set isLive = false for channels that were live but are now offline
			const wentOffline = transaction
				.update(channelCache)
				.set({
					isLive: false,
					lastLiveAt: sql`CURRENT_TIMESTAMP`,
					updatedAt: sql`CURRENT_TIMESTAMP`,
				})
				.where(and(eq(channelCache.isLive, true), notInLiveChannelsCondition))
				.returning({ channelId: channelCache.channelId })
				.all();

			// Also mark channels that are now live
			if (currentlyLiveChannelIds.length > 0) {
				transaction
					.update(channelCache)
					.set({
						isLive: true,
						updatedAt: sql`CURRENT_TIMESTAMP`,
					})
					.where(inArray(channelCache.channelId, currentlyLiveChannelIds))
					.run();
			}

			return wentOffline.map((row) => row.channelId);
		});
	} catch (error) {
		console.error(
			"[channel-cache.repository] processLiveStateChangesAtomic failed:",
			error
		);
		return new Error("Failed to process live state changes");
	}
}

export {
	getAllChannelCaches,
	getChannelCache,
	getChannelCacheBulk,
	processLiveStateChangesAtomic,
	updateChannelLiveState,
	updateLatestVideoId,
	upsertChannelCache,
};
