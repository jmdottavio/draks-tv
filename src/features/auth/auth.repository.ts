import { eq, sql } from "drizzle-orm";

import { database } from "@/src/db";
import { auth } from "@/src/db/schema";
import { decryptToken, encryptToken } from "@/src/shared/utils/token-encryption";

function ensureAuthRowExists() {
	database.insert(auth).values({ id: 1 }).onConflictDoNothing().run();
}

export function getAuth() {
	try {
		ensureAuthRowExists();

		const row = database.select().from(auth).where(eq(auth.id, 1)).get();

		if (row === undefined) {
			return { accessToken: null, refreshToken: null, userId: null, expiresAt: null };
		}

		let accessToken: string | null = null;
		let refreshToken: string | null = null;

		if (row.accessToken !== null) {
			const decrypted = decryptToken(row.accessToken);
			accessToken = decrypted instanceof Error ? null : decrypted;
		}

		if (row.refreshToken !== null) {
			const decrypted = decryptToken(row.refreshToken);
			refreshToken = decrypted instanceof Error ? null : decrypted;
		}

		return {
			accessToken,
			refreshToken,
			userId: row.userId,
			expiresAt: row.expiresAt,
		};
	} catch (error) {
		console.error("[auth.repository] getAuth failed:", error);
		return new Error("Failed to get authentication data");
	}
}

export function setAuth(
	accessToken: string,
	refreshToken: string,
	userId: string,
	expiresIn?: number,
) {
	try {
		ensureAuthRowExists();

		const encryptedAccessToken = encryptToken(accessToken);
		const encryptedRefreshToken = encryptToken(refreshToken);

		// Calculate expiry timestamp from expires_in (seconds until expiry)
		const expiresAt =
			expiresIn !== undefined ? Math.floor(Date.now() / 1000) + expiresIn : null;

		database
			.update(auth)
			.set({
				accessToken: encryptedAccessToken,
				refreshToken: encryptedRefreshToken,
				userId,
				expiresAt,
				updatedAt: sql`CURRENT_TIMESTAMP`,
			})
			.where(eq(auth.id, 1))
			.run();

		return null;
	} catch (error) {
		console.error("[auth.repository] setAuth failed:", error);
		return new Error("Failed to save authentication data");
	}
}

export function clearAuth() {
	try {
		ensureAuthRowExists();

		database
			.update(auth)
			.set({
				accessToken: null,
				refreshToken: null,
				userId: null,
				expiresAt: null,
				updatedAt: sql`CURRENT_TIMESTAMP`,
			})
			.where(eq(auth.id, 1))
			.run();

		return null;
	} catch (error) {
		console.error("[auth.repository] clearAuth failed:", error);
		return new Error("Failed to clear authentication data");
	}
}
