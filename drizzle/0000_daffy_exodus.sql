CREATE TABLE `auth` (
	`id` integer PRIMARY KEY NOT NULL,
	`access_token` text,
	`refresh_token` text,
	`user_id` text,
	`expires_at` integer,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE `channel_last_seen` (
	`twitch_id` text PRIMARY KEY NOT NULL,
	`login` text NOT NULL,
	`display_name` text NOT NULL,
	`last_seen_at` text NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE `favorites` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`twitch_id` text NOT NULL,
	`login` text NOT NULL,
	`display_name` text NOT NULL,
	`profile_image` text NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE UNIQUE INDEX `favorites_twitch_id_unique` ON `favorites` (`twitch_id`);--> statement-breakpoint
CREATE INDEX `favorites_sort_order_idx` ON `favorites` (`sort_order`);