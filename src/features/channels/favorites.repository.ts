import { asc, count, eq, max } from "drizzle-orm";

import { database } from "@/src/db";
import { favorites } from "@/src/db/schema";

import type { FavoriteInput, FavoriteOutput } from "./channels.types";

function getAllFavorites() {
	try {
		const rows = database
			.select({
				twitchId: favorites.twitchId,
				login: favorites.login,
				displayName: favorites.displayName,
				profileImage: favorites.profileImage,
			})
			.from(favorites)
			.orderBy(asc(favorites.sortOrder))
			.all();

		const result: Array<FavoriteOutput> = rows.map((row) => ({
			id: row.twitchId,
			login: row.login,
			displayName: row.displayName,
			profileImage: row.profileImage,
		}));

		return result;
	} catch (error) {
		console.error("[favorites.repository] getAllFavorites failed:", error);
		return new Error("Failed to get favorites");
	}
}

function addFavorite(favorite: FavoriteInput) {
	try {
		database.transaction((transaction) => {
			// Get next sort order inside the transaction
			const result = transaction
				.select({ maxOrder: max(favorites.sortOrder) })
				.from(favorites)
				.get();

			const nextSortOrder =
				result?.maxOrder !== null && result?.maxOrder !== undefined
					? result.maxOrder + 1
					: 0;

			// Insert with the sort order - use returning to verify
			const inserted = transaction
				.insert(favorites)
				.values({
					twitchId: favorite.id,
					login: favorite.login,
					displayName: favorite.displayName,
					profileImage: favorite.profileImage,
					sortOrder: nextSortOrder,
				})
				.returning({ id: favorites.id })
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

function removeFavorite(twitchId: string) {
	try {
		const deleted = database
			.delete(favorites)
			.where(eq(favorites.twitchId, twitchId))
			.returning({ twitchId: favorites.twitchId })
			.all();

		return deleted.length > 0;
	} catch (error) {
		console.error("[favorites.repository] removeFavorite failed:", error);
		return new Error("Failed to remove favorite");
	}
}

function isFavorite(twitchId: string) {
	try {
		const result = database
			.select({ count: count() })
			.from(favorites)
			.where(eq(favorites.twitchId, twitchId))
			.get();

		return result !== undefined && result.count > 0;
	} catch (error) {
		console.error("[favorites.repository] isFavorite failed:", error);
		return new Error("Failed to check favorite status");
	}
}

function reorderFavorites(orderedIds: Array<string>) {
	try {
		database.transaction((transaction) => {
			for (let index = 0; index < orderedIds.length; index++) {
				const twitchId = orderedIds[index];

				if (twitchId !== undefined) {
					transaction
						.update(favorites)
						.set({ sortOrder: index })
						.where(eq(favorites.twitchId, twitchId))
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

export { addFavorite, getAllFavorites, isFavorite, removeFavorite, reorderFavorites };
