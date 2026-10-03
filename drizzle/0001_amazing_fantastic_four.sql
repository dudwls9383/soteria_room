CREATE TABLE `channel_previews` (
	`id` text PRIMARY KEY NOT NULL,
	`data` text NOT NULL,
	`checked_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `media_locks` (
	`id` text PRIMARY KEY NOT NULL,
	`owner` text,
	`lease_until` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE `video_facts` (
	`id` text PRIMARY KEY NOT NULL,
	`data` text NOT NULL,
	`checked_at` integer NOT NULL
);
