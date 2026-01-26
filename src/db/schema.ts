import { sqliteTable, integer, text, index } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

export const auth = sqliteTable("auth", {
	id: integer("id").primaryKey(),
	accessToken: text("access_token"),
	refreshToken: text("refresh_token"),
	userId: text("user_id"),
	updatedAt: text("updated_at").default(sql`CURRENT_TIMESTAMP`),
});

export const favorites = sqliteTable(
	"favorites",
	{
		id: integer("id").primaryKey({ autoIncrement: true }),
		twitchId: text("twitch_id").unique().notNull(),
		login: text("login").notNull(),
		displayName: text("display_name").notNull(),
		profileImage: text("profile_image").notNull(),
		sortOrder: integer("sort_order").default(0).notNull(),
		createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`),
	},
	(table) => [index("favorites_sort_order_idx").on(table.sortOrder)],
);

export const channelLastSeen = sqliteTable("channel_last_seen", {
	twitchId: text("twitch_id").primaryKey(),
	login: text("login").notNull(),
	displayName: text("display_name").notNull(),
	lastSeenAt: text("last_seen_at").notNull(),
	updatedAt: text("updated_at").default(sql`CURRENT_TIMESTAMP`),
});
