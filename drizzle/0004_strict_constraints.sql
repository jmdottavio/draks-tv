BEGIN TRANSACTION;
--> statement-breakpoint
PRAGMA foreign_keys=OFF;
--> statement-breakpoint
DROP TABLE IF EXISTS `vods_new`;
--> statement-breakpoint
DROP TABLE IF EXISTS `followed_channels_new`;
--> statement-breakpoint
CREATE TABLE `followed_channels_new` (
	`channel_id` text PRIMARY KEY NOT NULL,
	`channel_name` text NOT NULL,
	`profile_image_url` text NOT NULL,
	`is_live` integer DEFAULT false NOT NULL,
	`is_favorite` integer DEFAULT false NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`last_seen_at` text,
	`latest_vod_id` text,
	`followed_at` text,
	`fetched_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT `followed_channels_is_live_bool` CHECK (`is_live` IN (0, 1)),
	CONSTRAINT `followed_channels_is_favorite_bool` CHECK (`is_favorite` IN (0, 1)),
	FOREIGN KEY (`latest_vod_id`) REFERENCES `vods`(`vod_id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
INSERT INTO `followed_channels_new` (
	`channel_id`,
	`channel_name`,
	`profile_image_url`,
	`is_live`,
	`is_favorite`,
	`sort_order`,
	`last_seen_at`,
	`latest_vod_id`,
	`followed_at`,
	`fetched_at`,
	`updated_at`
)
SELECT
	`channel_id`,
	`channel_name`,
	`profile_image_url`,
	`is_live`,
	`is_favorite`,
	`sort_order`,
	`last_seen_at`,
	`latest_vod_id`,
	`followed_at`,
	`fetched_at`,
	`updated_at`
FROM `followed_channels`;
--> statement-breakpoint
CREATE TABLE `vods_new` (
	`vod_id` text PRIMARY KEY NOT NULL,
	`channel_id` text NOT NULL,
	`title` text NOT NULL,
	`duration_seconds` integer DEFAULT 0 NOT NULL,
	`created_at` text NOT NULL,
	`thumbnail_url` text NOT NULL,
	`playback_position_seconds` integer DEFAULT 0 NOT NULL,
	`playback_updated_at` text,
	`fetched_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT `vods_duration_non_negative` CHECK (`duration_seconds` >= 0),
	CONSTRAINT `vods_playback_position_non_negative` CHECK (`playback_position_seconds` >= 0),
	FOREIGN KEY (`channel_id`) REFERENCES `followed_channels`(`channel_id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `vods_new` (
	`vod_id`,
	`channel_id`,
	`title`,
	`duration_seconds`,
	`created_at`,
	`thumbnail_url`,
	`playback_position_seconds`,
	`playback_updated_at`,
	`fetched_at`
)
SELECT
	`vod_id`,
	`channel_id`,
	`title`,
	COALESCE(`duration_seconds`, 0),
	`created_at`,
	`thumbnail_url`,
	COALESCE(`playback_position_seconds`, 0),
	`playback_updated_at`,
	`fetched_at`
FROM `vods`;
--> statement-breakpoint
DROP TABLE IF EXISTS `vods`;
--> statement-breakpoint
ALTER TABLE `vods_new` RENAME TO `vods`;
--> statement-breakpoint
DROP TABLE IF EXISTS `followed_channels`;
--> statement-breakpoint
ALTER TABLE `followed_channels_new` RENAME TO `followed_channels`;
--> statement-breakpoint
CREATE INDEX `vods_channel_created_idx` ON `vods` (`channel_id`,`created_at`);
--> statement-breakpoint
CREATE INDEX `vods_fetched_at_idx` ON `vods` (`fetched_at`);
--> statement-breakpoint
CREATE INDEX `vods_playback_updated_idx` ON `vods` (`playback_updated_at`);
--> statement-breakpoint
CREATE INDEX `followed_channels_channel_name_idx` ON `followed_channels` (`channel_name`);
--> statement-breakpoint
CREATE INDEX `followed_channels_favorite_sort_idx` ON `followed_channels` (`is_favorite`,`sort_order`);
--> statement-breakpoint
CREATE INDEX `followed_channels_is_live_idx` ON `followed_channels` (`is_live`);
--> statement-breakpoint
CREATE INDEX `followed_channels_latest_vod_id_idx` ON `followed_channels` (`latest_vod_id`);
--> statement-breakpoint
PRAGMA foreign_keys=ON;
--> statement-breakpoint
COMMIT;
