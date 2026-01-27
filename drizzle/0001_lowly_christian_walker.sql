CREATE TABLE `cached_vods` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`video_id` text NOT NULL,
	`channel_id` text NOT NULL,
	`title` text NOT NULL,
	`duration` text NOT NULL,
	`created_at` text NOT NULL,
	`thumbnail_url` text NOT NULL,
	`fetched_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `cached_vods_video_id_unique` ON `cached_vods` (`video_id`);--> statement-breakpoint
CREATE INDEX `cached_vods_channel_created_idx` ON `cached_vods` (`channel_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `channel_cache` (
	`channel_id` text PRIMARY KEY NOT NULL,
	`is_live` integer DEFAULT false NOT NULL,
	`last_live_at` text,
	`latest_video_id` integer,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`latest_video_id`) REFERENCES `cached_vods`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `channel_cache_latest_video_id_idx` ON `channel_cache` (`latest_video_id`);--> statement-breakpoint
CREATE INDEX `channel_cache_is_live_idx` ON `channel_cache` (`is_live`);