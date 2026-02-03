CREATE TABLE `vods` (
	`vod_id` text PRIMARY KEY NOT NULL,
	`channel_id` text NOT NULL,
	`title` text NOT NULL,
	`duration_seconds` integer NOT NULL,
	`created_at` text NOT NULL,
	`thumbnail_url` text NOT NULL,
	`playback_position_seconds` integer DEFAULT 0 NOT NULL,
	`playback_updated_at` text,
	`fetched_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE INDEX `vods_channel_created_idx` ON `vods` (`channel_id`,`created_at`);
--> statement-breakpoint
CREATE INDEX `vods_fetched_at_idx` ON `vods` (`fetched_at`);
--> statement-breakpoint
CREATE INDEX `vods_playback_updated_idx` ON `vods` (`playback_updated_at`);
--> statement-breakpoint
CREATE TABLE `followed_channels` (
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
	FOREIGN KEY (`latest_vod_id`) REFERENCES `vods`(`vod_id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `followed_channels_channel_name_idx` ON `followed_channels` (`channel_name`);
--> statement-breakpoint
CREATE INDEX `followed_channels_favorite_sort_idx` ON `followed_channels` (`is_favorite`,`sort_order`);
--> statement-breakpoint
CREATE INDEX `followed_channels_is_live_idx` ON `followed_channels` (`is_live`);
--> statement-breakpoint
CREATE INDEX `followed_channels_latest_vod_id_idx` ON `followed_channels` (`latest_vod_id`);
--> statement-breakpoint
INSERT INTO `vods` (
	`vod_id`,
	`channel_id`,
	`title`,
	`duration_seconds`,
	`created_at`,
	`thumbnail_url`,
	`fetched_at`
)
SELECT
	`video_id`,
	`channel_id`,
	`title`,
	(
		(CASE
			WHEN instr(`duration`, 'h') > 0 THEN CAST(substr(`duration`, 1, instr(`duration`, 'h') - 1) AS integer)
			ELSE 0
		END) * 3600 +
		(CASE
			WHEN instr(`duration`, 'm') > 0 AND instr(`duration`, 'h') > 0 THEN CAST(substr(`duration`, instr(`duration`, 'h') + 1, instr(`duration`, 'm') - instr(`duration`, 'h') - 1) AS integer)
			WHEN instr(`duration`, 'm') > 0 THEN CAST(substr(`duration`, 1, instr(`duration`, 'm') - 1) AS integer)
			ELSE 0
		END) * 60 +
		(CASE
			WHEN instr(`duration`, 's') > 0 AND instr(`duration`, 'm') > 0 THEN CAST(substr(`duration`, instr(`duration`, 'm') + 1, instr(`duration`, 's') - instr(`duration`, 'm') - 1) AS integer)
			WHEN instr(`duration`, 's') > 0 AND instr(`duration`, 'h') > 0 THEN CAST(substr(`duration`, instr(`duration`, 'h') + 1, instr(`duration`, 's') - instr(`duration`, 'h') - 1) AS integer)
			WHEN instr(`duration`, 's') > 0 THEN CAST(substr(`duration`, 1, instr(`duration`, 's') - 1) AS integer)
			ELSE 0
		END)
	),
	`created_at`,
	`thumbnail_url`,
	`fetched_at`
FROM `cached_vods`;
--> statement-breakpoint
INSERT INTO `vods` (
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
	`vod_title`,
	COALESCE(`duration_seconds`, 0),
	COALESCE(`updated_at`, CURRENT_TIMESTAMP),
	'',
	`position_seconds`,
	`updated_at`,
	COALESCE(`updated_at`, CURRENT_TIMESTAMP)
FROM `vod_playback_progress`
WHERE NOT EXISTS (
	SELECT 1 FROM `vods` WHERE `vods`.`vod_id` = `vod_playback_progress`.`vod_id`
);
--> statement-breakpoint
UPDATE `vods`
SET
	`playback_position_seconds` = (
		SELECT `position_seconds`
		FROM `vod_playback_progress`
		WHERE `vod_playback_progress`.`vod_id` = `vods`.`vod_id`
	),
	`playback_updated_at` = (
		SELECT COALESCE(`updated_at`, CURRENT_TIMESTAMP)
		FROM `vod_playback_progress`
		WHERE `vod_playback_progress`.`vod_id` = `vods`.`vod_id`
	),
	`duration_seconds` = (
		SELECT COALESCE(`duration_seconds`, `vods`.`duration_seconds`)
		FROM `vod_playback_progress`
		WHERE `vod_playback_progress`.`vod_id` = `vods`.`vod_id`
	)
WHERE EXISTS (
	SELECT 1 FROM `vod_playback_progress` WHERE `vod_playback_progress`.`vod_id` = `vods`.`vod_id`
);
--> statement-breakpoint
INSERT INTO `followed_channels` (
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
	`channel_cache`.`channel_id`,
	COALESCE(`favorites`.`login`, `channel_last_seen`.`login`, ''),
	COALESCE(`favorites`.`profile_image`, ''),
	COALESCE(`channel_cache`.`is_live`, 0),
	CASE WHEN `favorites`.`twitch_id` IS NOT NULL THEN 1 ELSE 0 END,
	COALESCE(`favorites`.`sort_order`, 0),
	COALESCE(`channel_last_seen`.`last_seen_at`, `channel_cache`.`last_live_at`),
	(
		SELECT `cached_vods`.`video_id`
		FROM `cached_vods`
		WHERE `cached_vods`.`id` = `channel_cache`.`latest_video_id`
	),
	NULL,
	CURRENT_TIMESTAMP,
	COALESCE(`channel_cache`.`updated_at`, CURRENT_TIMESTAMP)
FROM `channel_cache`
LEFT JOIN `favorites` ON `favorites`.`twitch_id` = `channel_cache`.`channel_id`
LEFT JOIN `channel_last_seen` ON `channel_last_seen`.`twitch_id` = `channel_cache`.`channel_id`;
--> statement-breakpoint
INSERT INTO `followed_channels` (
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
	`favorites`.`twitch_id`,
	`favorites`.`login`,
	`favorites`.`profile_image`,
	0,
	1,
	`favorites`.`sort_order`,
	NULL,
	NULL,
	NULL,
	CURRENT_TIMESTAMP,
	CURRENT_TIMESTAMP
FROM `favorites`
WHERE NOT EXISTS (
	SELECT 1 FROM `followed_channels` WHERE `followed_channels`.`channel_id` = `favorites`.`twitch_id`
);
--> statement-breakpoint
INSERT INTO `followed_channels` (
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
	`channel_last_seen`.`twitch_id`,
	`channel_last_seen`.`login`,
	'',
	0,
	0,
	0,
	`channel_last_seen`.`last_seen_at`,
	NULL,
	NULL,
	CURRENT_TIMESTAMP,
	COALESCE(`channel_last_seen`.`updated_at`, CURRENT_TIMESTAMP)
FROM `channel_last_seen`
WHERE NOT EXISTS (
	SELECT 1 FROM `followed_channels` WHERE `followed_channels`.`channel_id` = `channel_last_seen`.`twitch_id`
);
--> statement-breakpoint
UPDATE `followed_channels`
SET `last_seen_at` = CASE
	WHEN `last_seen_at` IS NULL THEN (
		SELECT `created_at` FROM `vods` WHERE `vods`.`vod_id` = `followed_channels`.`latest_vod_id`
	)
	WHEN `latest_vod_id` IS NOT NULL AND datetime((
		SELECT `created_at` FROM `vods` WHERE `vods`.`vod_id` = `followed_channels`.`latest_vod_id`
	)) > datetime(`last_seen_at`) THEN (
		SELECT `created_at` FROM `vods` WHERE `vods`.`vod_id` = `followed_channels`.`latest_vod_id`
	)
	ELSE `last_seen_at`
END
WHERE `latest_vod_id` IS NOT NULL;
--> statement-breakpoint
DROP TABLE `vod_playback_progress`;
--> statement-breakpoint
DROP TABLE `channel_cache`;
--> statement-breakpoint
DROP TABLE `cached_vods`;
--> statement-breakpoint
DROP TABLE `channel_last_seen`;
--> statement-breakpoint
DROP TABLE `favorites`;
