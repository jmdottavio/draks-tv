import { Database } from 'bun:sqlite';
import { resolve } from 'path';

const dbPath = resolve(import.meta.dir, '../../../data/draks-tv.db');
const db = new Database(dbPath);

// Initialize schema
db.run(`
  CREATE TABLE IF NOT EXISTS favorites (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    twitch_id TEXT UNIQUE NOT NULL,
    login TEXT NOT NULL,
    display_name TEXT NOT NULL,
    profile_image TEXT NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  )
`);

db.run(`
  CREATE TABLE IF NOT EXISTS auth (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    access_token TEXT,
    user_id TEXT,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
  )
`);

// Ensure auth row exists
db.run(`INSERT OR IGNORE INTO auth (id) VALUES (1)`);

export { db };
