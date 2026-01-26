import { Database } from "bun:sqlite";
import { drizzle } from "drizzle-orm/bun-sqlite";

import * as schema from "./schema";

let drizzleInstance: ReturnType<typeof drizzle> | null = null;

function getDatabase() {
	if (drizzleInstance === null) {
		const sqlite = new Database("./data/draks-tv.db");
		drizzleInstance = drizzle(sqlite, { schema });
	}
	return drizzleInstance;
}

export const database = getDatabase();
