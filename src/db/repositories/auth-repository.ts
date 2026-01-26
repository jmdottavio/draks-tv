import { eq, sql } from "drizzle-orm";

import { database } from "@/src/db";
import { auth } from "@/src/db/schema";

function ensureAuthRowExists() {
	database
		.insert(auth)
		.values({ id: 1 })
		.onConflictDoNothing()
		.run();
}

function getAuth() {
	try {
		ensureAuthRowExists();

		const row = database.select().from(auth).where(eq(auth.id, 1)).get();

		if (row === undefined) {
			return { accessToken: null, refreshToken: null, userId: null };
		}

		return {
			accessToken: row.accessToken,
			refreshToken: row.refreshToken,
			userId: row.userId,
		};
	} catch (error) {
		const message = error instanceof Error ? error.message : "Unknown database error";
		return new Error(`Failed to get auth: ${message}`);
	}
}

function setAuth(accessToken: string, refreshToken: string, userId: string) {
	try {
		ensureAuthRowExists();

		database
			.update(auth)
			.set({
				accessToken,
				refreshToken,
				userId,
				updatedAt: sql`CURRENT_TIMESTAMP`,
			})
			.where(eq(auth.id, 1))
			.run();

		return null;
	} catch (error) {
		const message = error instanceof Error ? error.message : "Unknown database error";
		return new Error(`Failed to set auth: ${message}`);
	}
}

function clearAuth() {
	try {
		ensureAuthRowExists();

		database
			.update(auth)
			.set({
				accessToken: null,
				refreshToken: null,
				userId: null,
				updatedAt: sql`CURRENT_TIMESTAMP`,
			})
			.where(eq(auth.id, 1))
			.run();

		return null;
	} catch (error) {
		const message = error instanceof Error ? error.message : "Unknown database error";
		return new Error(`Failed to clear auth: ${message}`);
	}
}

export { getAuth, setAuth, clearAuth };
