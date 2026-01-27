import { sql } from "drizzle-orm";
import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const auth = sqliteTable("auth", {
	id: integer("id").primaryKey(),
	accessToken: text("access_token"),
	refreshToken: text("refresh_token"),
	userId: text("user_id"),
	expiresAt: integer("expires_at"),
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

// VOD caching tables
export const cachedVods = sqliteTable(
	"cached_vods",
	{
		id: integer("id").primaryKey({ autoIncrement: true }),
		// videoId has implicit unique index from .unique() constraint - used for conflict resolution
		videoId: text("video_id").notNull().unique(),
		channelId: text("channel_id").notNull(),
		title: text("title").notNull(),
		duration: text("duration").notNull(),
		createdAt: text("created_at").notNull(),
		thumbnailUrl: text("thumbnail_url").notNull(),
		fetchedAt: text("fetched_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
	},
	(table) => [
		// Single composite index covers both channelId-only and channelId+createdAt queries
		index("cached_vods_channel_created_idx").on(table.channelId, table.createdAt),
	]
);

export const channelCache = sqliteTable(
	"channel_cache",
	{
		channelId: text("channel_id").primaryKey(),
		isLive: integer("is_live", { mode: "boolean" }).notNull().default(false),
		lastLiveAt: text("last_live_at"),
		latestVideoId: integer("latest_video_id").references(() => cachedVods.id, {
			onDelete: "set null",
		}),
		updatedAt: text("updated_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
	},
	(table) => [
		index("channel_cache_latest_video_id_idx").on(table.latestVideoId),
		index("channel_cache_is_live_idx").on(table.isLive),
	]
);

// Export inferred types for VOD caching
export type CachedVideoSelect = typeof cachedVods.$inferSelect;
export type CachedVideoInsert = typeof cachedVods.$inferInsert;
export type ChannelCacheSelect = typeof channelCache.$inferSelect;
export type ChannelCacheInsert = typeof channelCache.$inferInsert;
