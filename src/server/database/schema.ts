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
    sort_order INTEGER DEFAULT 0,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  )
`);

// Migration: Add sort_order column if it doesn't exist
const hasColumn = db.query<{ count: number }, []>(
  `SELECT COUNT(*) as count FROM pragma_table_info('favorites') WHERE name = 'sort_order'`
).get();

if (hasColumn !== null && hasColumn.count === 0) {
  db.run('ALTER TABLE favorites ADD COLUMN sort_order INTEGER DEFAULT 0');
  // Initialize sort_order based on existing order
  db.run(`
    UPDATE favorites SET sort_order = (
      SELECT COUNT(*) FROM favorites f2 WHERE f2.created_at <= favorites.created_at
    )
  `);
}

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
