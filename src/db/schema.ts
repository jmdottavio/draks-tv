import { sql } from "drizzle-orm";
import { check, index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const auth = sqliteTable("auth", {
	id: integer("id").primaryKey(),
	accessToken: text("access_token"),
	refreshToken: text("refresh_token"),
	userId: text("user_id"),
	expiresAt: integer("expires_at"),
	updatedAt: text("updated_at").default(sql`CURRENT_TIMESTAMP`),
});

export const vods = sqliteTable(
	"vods",
	{
		vodId: text("vod_id").primaryKey(),
		channelId: text("channel_id")
			.notNull()
			.references(() => followedChannels.channelId, { onDelete: "cascade" }),
		title: text("title").notNull(),
		durationSeconds: integer("duration_seconds").notNull().default(0),
		createdAt: text("created_at").notNull(),
		thumbnailUrl: text("thumbnail_url").notNull(),
		playbackPositionSeconds: integer("playback_position_seconds").notNull().default(0),
		playbackUpdatedAt: text("playback_updated_at"),
		fetchedAt: text("fetched_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
	},
	(table) => [
		index("vods_channel_created_idx").on(table.channelId, table.createdAt),
		index("vods_fetched_at_idx").on(table.fetchedAt),
		index("vods_playback_updated_idx").on(table.playbackUpdatedAt),
		check(
			"vods_duration_non_negative",
			sql`${table.durationSeconds} >= 0`,
		),
		check(
			"vods_playback_position_non_negative",
			sql`${table.playbackPositionSeconds} >= 0`,
		),
	],
);

export const followedChannels = sqliteTable(
	"followed_channels",
	{
		channelId: text("channel_id").primaryKey(),
		channelName: text("channel_name").notNull(),
		profileImageUrl: text("profile_image_url").notNull(),
		isLive: integer("is_live", { mode: "boolean" }).notNull().default(false),
		isFavorite: integer("is_favorite", { mode: "boolean" }).notNull().default(false),
		sortOrder: integer("sort_order").notNull().default(0),
		lastSeenAt: text("last_seen_at"),
		latestVodId: text("latest_vod_id"),
		followedAt: text("followed_at"),
		fetchedAt: text("fetched_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
		updatedAt: text("updated_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
	},
	(table) => [
		index("followed_channels_channel_name_idx").on(table.channelName),
		index("followed_channels_favorite_sort_idx").on(table.isFavorite, table.sortOrder),
		index("followed_channels_is_live_idx").on(table.isLive),
		index("followed_channels_latest_vod_id_idx").on(table.latestVodId),
		check("followed_channels_is_live_bool", sql`${table.isLive} IN (0, 1)`),
		check("followed_channels_is_favorite_bool", sql`${table.isFavorite} IN (0, 1)`),
	],
);
