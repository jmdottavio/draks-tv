import { Database } from "bun:sqlite";
import { drizzle } from "drizzle-orm/bun-sqlite";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";

import * as schema from "./schema";

let drizzleInstance: ReturnType<typeof drizzle> | null = null;

function getDatabase() {
	if (drizzleInstance === null) {
		const dbPath = resolve(process.cwd(), "data/draks-tv.db");
		mkdirSync(dirname(dbPath), { recursive: true });

		const sqlite = new Database(dbPath);
		drizzleInstance = drizzle(sqlite, { schema });
	}

	return drizzleInstance;
}

export const database = getDatabase();
