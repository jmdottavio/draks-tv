import { and, asc, count, desc, eq, inArray, max, notInArray, sql } from "drizzle-orm";

import { database } from "@/src/db";
import { followedChannels, vods } from "@/src/db/schema";

import type { FavoriteInput } from "@/src/features/channels/channels.types";
import type { VodSummary } from "@/src/features/vods/vods.types";

type FollowedChannelUpsertInput = {
	channelId: string;
	channelName: string;
	profileImageUrl: string;
	followedAt: string | null;
};

export function getAllFollowedChannels() {
	try {
		return database
			.select({
				channelId: followedChannels.channelId,
				channelName: followedChannels.channelName,
				profileImageUrl: followedChannels.profileImageUrl,
				isFavorite: followedChannels.isFavorite,
				sortOrder: followedChannels.sortOrder,
				isLive: followedChannels.isLive,
				lastSeenAt: followedChannels.lastSeenAt,
				latestVodId: followedChannels.latestVodId,
				updatedAt: followedChannels.updatedAt,
			})
			.from(followedChannels)
			.orderBy(asc(followedChannels.sortOrder))
			.all();
	} catch (error) {
		console.error("[followed-channels.repository] getAllFollowedChannels failed:", error);
		return new Error("Failed to get followed channels");
	}
}

export function getFollowedChannelIdentity(channelId: string) {
	try {
		const row = database
			.select({
				channelId: followedChannels.channelId,
				channelName: followedChannels.channelName,
				profileImageUrl: followedChannels.profileImageUrl,
			})
			.from(followedChannels)
			.where(eq(followedChannels.channelId, channelId))
			.get();

		return row ?? null;
	} catch (error) {
		console.error("[followed-channels.repository] getFollowedChannelIdentity failed:", error);
		return new Error("Failed to get followed channel");
	}
}

export function getProfileImagesByChannelIds(channelIds: Array<string>) {
	try {
		if (channelIds.length === 0) {
			return new Map<string, string>();
		}

		const rows = database
			.select({
				channelId: followedChannels.channelId,
				profileImageUrl: followedChannels.profileImageUrl,
			})
			.from(followedChannels)
			.where(inArray(followedChannels.channelId, channelIds))
			.all();

		return new Map(rows.map((row) => [row.channelId, row.profileImageUrl]));
	} catch (error) {
		console.error(
			"[followed-channels.repository] getProfileImagesByChannelIds failed:",
			error,
		);
		return new Error("Failed to get profile images");
	}
}

export function getFavoriteChannelIds() {
	try {
		const rows = database
			.select({ channelId: followedChannels.channelId })
			.from(followedChannels)
			.where(eq(followedChannels.isFavorite, true))
			.orderBy(asc(followedChannels.sortOrder))
			.all();

		return rows.map((row) => row.channelId);
	} catch (error) {
		console.error("[followed-channels.repository] getFavoriteChannelIds failed:", error);
		return new Error("Failed to get favorite channel ids");
	}
}

export function addFavorite(favorite: FavoriteInput) {
	try {
		const transactionResult = database.transaction((transaction) => {
			const result = transaction
				.select({ maxOrder: max(followedChannels.sortOrder) })
				.from(followedChannels)
				.where(eq(followedChannels.isFavorite, true))
				.get();

			const nextSortOrder =
				result?.maxOrder !== null && result?.maxOrder !== undefined
					? result.maxOrder + 1
					: 0;

			const inserted = transaction
				.update(followedChannels)
				.set({
					isFavorite: true,
					sortOrder: nextSortOrder,
					updatedAt: sql`CURRENT_TIMESTAMP`,
				})
				.where(eq(followedChannels.channelId, favorite.id))
				.returning({ id: followedChannels.channelId })
				.get();

			if (inserted === undefined) {
				return new Error("Insert did not return a row");
			}

			return null;
		});

		if (transactionResult instanceof Error) {
			return transactionResult;
		}

		return null;
	} catch (error) {
		console.error("[followed-channels.repository] addFavorite failed:", error);
		return new Error("Failed to add favorite");
	}
}

export function removeFavorite(twitchId: string) {
	try {
		const deleted = database
			.update(followedChannels)
			.set({
				isFavorite: false,
				sortOrder: 0,
				updatedAt: sql`CURRENT_TIMESTAMP`,
			})
			.where(eq(followedChannels.channelId, twitchId))
			.returning({ channelId: followedChannels.channelId })
			.all();

		return deleted.length > 0;
	} catch (error) {
		console.error("[followed-channels.repository] removeFavorite failed:", error);
		return new Error("Failed to remove favorite");
	}
}

export function isFavorite(twitchId: string) {
	try {
		const result = database
			.select({ count: count() })
			.from(followedChannels)
			.where(
				and(
					eq(followedChannels.channelId, twitchId),
					eq(followedChannels.isFavorite, true),
				),
			)
			.get();

		return result !== undefined && result.count > 0;
	} catch (error) {
		console.error("[followed-channels.repository] isFavorite failed:", error);
		return new Error("Failed to check favorite status");
	}
}

export function reorderFavorites(orderedIds: Array<string>) {
	try {
		database.transaction((transaction) => {
			for (let index = 0; index < orderedIds.length; index++) {
				const channelId = orderedIds[index];

				if (channelId !== undefined) {
					transaction
						.update(followedChannels)
						.set({ sortOrder: index, updatedAt: sql`CURRENT_TIMESTAMP` })
						.where(eq(followedChannels.channelId, channelId))
						.run();
				}
			}
		});

		return null;
	} catch (error) {
		console.error("[followed-channels.repository] reorderFavorites failed:", error);
		return new Error("Failed to reorder favorites");
	}
}

export function upsertFollowedChannels(
	channels: Array<FollowedChannelUpsertInput>,
	fetchedAt: string,
) {
	try {
		database.transaction((transaction) => {
			for (const channel of channels) {
				transaction
					.insert(followedChannels)
					.values({
						channelId: channel.channelId,
						channelName: channel.channelName,
						profileImageUrl: channel.profileImageUrl,
						followedAt: channel.followedAt,
						fetchedAt,
						updatedAt: sql`CURRENT_TIMESTAMP`,
					})
					.onConflictDoUpdate({
						target: followedChannels.channelId,
						set: {
							channelName: channel.channelName,
							profileImageUrl: channel.profileImageUrl,
							followedAt: channel.followedAt,
							fetchedAt,
							updatedAt: sql`CURRENT_TIMESTAMP`,
						},
					})
					.run();
			}
		});

		return null;
	} catch (error) {
		console.error("[followed-channels.repository] upsertFollowedChannels failed:", error);
		return new Error("Failed to upsert followed channels");
	}
}

export function removeUnfollowedChannels(channelIds: Array<string>) {
	try {
		if (channelIds.length === 0) {
			console.warn(
				"[followed-channels.repository] removeUnfollowedChannels skipped: empty channelIds",
			);
			return null;
		}

		database
			.delete(followedChannels)
			.where(notInArray(followedChannels.channelId, channelIds))
			.run();

		return null;
	} catch (error) {
		console.error("[followed-channels.repository] removeUnfollowedChannels failed:", error);
		return new Error("Failed to remove unfollowed channels");
	}
}

export function updateLiveStates(currentlyLiveChannelIds: Array<string>, lastSeenAt: string) {
	try {
		return database.transaction((transaction) => {
			let notInLiveCondition = sql`1=1`;
			if (currentlyLiveChannelIds.length > 0) {
				notInLiveCondition = notInArray(
					followedChannels.channelId,
					currentlyLiveChannelIds,
				);
			}

			const wentOffline = transaction
				.update(followedChannels)
				.set({
					isLive: false,
					updatedAt: sql`CURRENT_TIMESTAMP`,
				})
				.where(and(eq(followedChannels.isLive, true), notInLiveCondition))
				.returning({ channelId: followedChannels.channelId })
				.all();

			if (currentlyLiveChannelIds.length > 0) {
				transaction
					.update(followedChannels)
					.set({
						isLive: true,
						lastSeenAt,
						updatedAt: sql`CURRENT_TIMESTAMP`,
					})
					.where(inArray(followedChannels.channelId, currentlyLiveChannelIds))
					.run();
			}

			return wentOffline.map((row) => row.channelId);
		});
	} catch (error) {
		console.error("[followed-channels.repository] updateLiveStates failed:", error);
		return new Error("Failed to update live states");
	}
}

export function updateLatestVod(channelId: string, vodId: string, vodCreatedAt: string) {
	try {
		const channel = database
			.select({ lastSeenAt: followedChannels.lastSeenAt })
			.from(followedChannels)
			.where(eq(followedChannels.channelId, channelId))
			.get();

		if (channel === undefined) {
			return new Error("Channel not found");
		}

		let nextLastSeenAt: string | null = channel.lastSeenAt;
		if (channel.lastSeenAt === null) {
			nextLastSeenAt = vodCreatedAt;
		} else {
			const currentDate = new Date(channel.lastSeenAt);
			const vodDate = new Date(vodCreatedAt);
			if (Number.isNaN(currentDate.getTime())) {
				nextLastSeenAt = vodCreatedAt;
			} else if (!Number.isNaN(vodDate.getTime()) && vodDate > currentDate) {
				nextLastSeenAt = vodCreatedAt;
			}
		}

		database
			.update(followedChannels)
			.set({
				latestVodId: vodId,
				lastSeenAt: nextLastSeenAt,
				updatedAt: sql`CURRENT_TIMESTAMP`,
			})
			.where(eq(followedChannels.channelId, channelId))
			.run();

		return null;
	} catch (error) {
		console.error("[followed-channels.repository] updateLatestVod failed:", error);
		return new Error("Failed to update latest VOD");
	}
}

export function getLatestVodsByChannelIds(channelIds: Array<string>) {
	try {
		if (channelIds.length === 0) {
			return [];
		}

		const rows = database
			.select({
				channelId: followedChannels.channelId,
				latestVod: {
					id: vods.vodId,
					title: vods.title,
					durationSeconds: vods.durationSeconds,
					createdAt: vods.createdAt,
					thumbnailUrl: vods.thumbnailUrl,
				},
			})
			.from(followedChannels)
			.leftJoin(vods, eq(followedChannels.latestVodId, vods.vodId))
			.where(inArray(followedChannels.channelId, channelIds))
			.all();

		const results: Array<{
			channelId: string;
			latestVod: VodSummary | null;
		}> = [];
		for (const row of rows) {
			const latestVod =
				row.latestVod === null || row.latestVod.id === null ? null : row.latestVod;
			results.push({ channelId: row.channelId, latestVod });
		}

		return results;
	} catch (error) {
		console.error("[followed-channels.repository] getLatestVodsByChannelIds failed:", error);
		return new Error("Failed to get latest VODs");
	}
}

export function getRecentlyUpdatedChannels(limit: number) {
	try {
		return database
			.select({
				channelId: followedChannels.channelId,
				channelName: followedChannels.channelName,
				profileImageUrl: followedChannels.profileImageUrl,
			})
			.from(followedChannels)
			.orderBy(desc(followedChannels.updatedAt))
			.limit(limit)
			.all();
	} catch (error) {
		console.error("[followed-channels.repository] getRecentlyUpdatedChannels failed:", error);
		return new Error("Failed to get recent channels");
	}
}
