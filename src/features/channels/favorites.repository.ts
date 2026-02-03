import { and, asc, count, eq, max, sql } from "drizzle-orm";

import { database } from "@/src/db";
import { followedChannels } from "@/src/db/schema";

import type { FavoriteInput, FavoriteOutput } from "./channels.types";

export function getAllFavorites() {
	try {
		const rows = database
			.select({
				channelId: followedChannels.channelId,
				channelName: followedChannels.channelName,
				profileImage: followedChannels.profileImageUrl,
			})
			.from(followedChannels)
			.where(eq(followedChannels.isFavorite, true))
			.orderBy(asc(followedChannels.sortOrder))
			.all();

		const result: Array<FavoriteOutput> = rows.map((row) => ({
			id: row.channelId,
			channelName: row.channelName,
			profileImage: row.profileImage,
		}));

		return result;
	} catch (error) {
		console.error("[favorites.repository] getAllFavorites failed:", error);
		return new Error("Failed to get favorites");
	}
}

export function addFavorite(favorite: FavoriteInput) {
	try {
		database.transaction((transaction) => {
			// Get next sort order inside the transaction
			const result = transaction
				.select({ maxOrder: max(followedChannels.sortOrder) })
				.from(followedChannels)
				.where(eq(followedChannels.isFavorite, true))
				.get();

			const nextSortOrder =
				result?.maxOrder !== null && result?.maxOrder !== undefined
					? result.maxOrder + 1
					: 0;

			// Update existing followed channel to favorite
			const inserted = transaction
				.update(followedChannels)
				.set({
					isFavorite: true,
					sortOrder: nextSortOrder,
					profileImageUrl: favorite.profileImage,
					channelName: favorite.channelName,
					updatedAt: sql`CURRENT_TIMESTAMP`,
				})
				.where(eq(followedChannels.channelId, favorite.id))
				.returning({ id: followedChannels.channelId })
				.get();

			if (inserted === undefined) {
				throw new Error("Insert did not return a row");
			}
		});

		return null;
	} catch (error) {
		console.error("[favorites.repository] addFavorite failed:", error);
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
		console.error("[favorites.repository] removeFavorite failed:", error);
		return new Error("Failed to remove favorite");
	}
}

export function isFavorite(twitchId: string) {
	try {
		const result = database
			.select({ count: count() })
			.from(followedChannels)
			.where(
				and(eq(followedChannels.channelId, twitchId), eq(followedChannels.isFavorite, true)),
			)
			.get();

		return result !== undefined && result.count > 0;
	} catch (error) {
		console.error("[favorites.repository] isFavorite failed:", error);
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
		console.error("[favorites.repository] reorderFavorites failed:", error);
		return new Error("Failed to reorder favorites");
	}
}
