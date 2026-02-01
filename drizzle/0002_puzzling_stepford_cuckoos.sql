CREATE TABLE `vod_playback_progress` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`vod_id` text NOT NULL,
	`channel_id` text NOT NULL,
	`channel_name` text NOT NULL,
	`vod_title` text NOT NULL,
	`position_seconds` integer NOT NULL,
	`duration_seconds` integer,
	`created_at` text DEFAULT CURRENT_TIMESTAMP,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE UNIQUE INDEX `vod_playback_progress_vod_id_unique` ON `vod_playback_progress` (`vod_id`);--> statement-breakpoint
CREATE INDEX `vod_progress_channel_idx` ON `vod_playback_progress` (`channel_id`);--> statement-breakpoint
CREATE INDEX `vod_progress_updated_idx` ON `vod_playback_progress` (`updated_at`);