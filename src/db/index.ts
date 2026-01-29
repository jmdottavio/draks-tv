import { Database } from "bun:sqlite";
import { drizzle } from "drizzle-orm/bun-sqlite";
import { migrate } from "drizzle-orm/bun-sqlite/migrator";
import { chmodSync, existsSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";

import * as schema from "./schema";
import { validateAndLog } from "@/src/shared/utils/env-validation";

let drizzleInstance: ReturnType<typeof drizzle> | null = null;

/**
 * Sets secure file permissions on Unix systems.
 * On Windows, chmod doesn't work the same way, so we skip it.
 */
function setSecurePermissions(path: string, mode: number): void {
	if (process.platform === "win32") {
		return;
	}

	try {
		chmodSync(path, mode);
	} catch (error) {
		console.warn(
			`Failed to set permissions on ${path}:`,
			error instanceof Error ? error.message : error,
		);
	}
}

/**
 * Seeds migration history for databases that existed before migrations were introduced.
 * This allows Drizzle to skip migrations that were already applied manually or via db:push.
 */
function seedMigrationHistoryIfNeeded(sqlite: Database): void {
	// Check if auth table exists (indicates pre-existing database with tables already created)
	const authTableExists = sqlite
		.query("SELECT name FROM sqlite_master WHERE type='table' AND name='auth'")
		.get();

	if (authTableExists === null) {
		// Fresh database, migrations will create everything
		return;
	}

	// Ensure migrations table exists (using IF NOT EXISTS for idempotency)
	sqlite.exec(`
		CREATE TABLE IF NOT EXISTS __drizzle_migrations (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			hash TEXT NOT NULL,
			created_at INTEGER
		)
	`);

	// Check if initial migration is already recorded
	const initialMigrationExists = sqlite
		.query("SELECT id FROM __drizzle_migrations WHERE hash = ?")
		.get("0000_daffy_exodus");

	if (initialMigrationExists !== null) {
		// Migration already recorded, nothing to do
		return;
	}

	// Mark the initial migration as already applied since tables exist
	sqlite
		.query("INSERT INTO __drizzle_migrations (hash, created_at) VALUES (?, ?)")
		.run("0000_daffy_exodus", Date.now());

	// Add the expires_at column if it doesn't exist (for pre-existing auth tables)
	const columns = sqlite.query("PRAGMA table_info(auth)").all() as Array<{ name: string }>;
	const hasExpiresAt = columns.some((col) => col.name === "expires_at");

	if (!hasExpiresAt) {
		sqlite.exec("ALTER TABLE auth ADD COLUMN expires_at INTEGER");
	}

	console.log("[DB] Seeded migration history for existing database");
}

function getDatabase() {
	if (drizzleInstance === null) {
		// Validate environment on first database access (startup)
		validateAndLog();

		const dbPath = resolve(process.cwd(), "data/draks-tv.db");
		const dataDir = dirname(dbPath);
		const isNewDatabase = !existsSync(dbPath);

		mkdirSync(dataDir, { recursive: true });
		// Set directory permissions to 0700 (owner read/write/execute only)
		setSecurePermissions(dataDir, 0o700);

		const sqlite = new Database(dbPath);

		// Enable foreign key constraint enforcement (SQLite has this off by default)
		sqlite.exec("PRAGMA foreign_keys = ON");

		// Seed migration history for pre-existing databases before running migrations
		seedMigrationHistoryIfNeeded(sqlite);

		drizzleInstance = drizzle(sqlite, { schema });

		// Run migrations automatically on startup
		migrate(drizzleInstance, { migrationsFolder: "./drizzle" });

		// Set database file permissions to 0600 (owner read/write only)
		if (isNewDatabase) {
			setSecurePermissions(dbPath, 0o600);
		}
	}

	return drizzleInstance;
}

export const database = getDatabase();
