CREATE TABLE `games` (
	`id` text PRIMARY KEY NOT NULL,
	`visitor` text NOT NULL,
	`playlist_id` text NOT NULL,
	`tracks` text NOT NULL,
	`created_at` integer NOT NULL,
	`completed_at` integer,
	`results` text,
	`winners` text
);
--> statement-breakpoint
CREATE INDEX `idx_games_visitor_created` ON `games` (`visitor`,`created_at`);--> statement-breakpoint
CREATE TABLE `playlists` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`tracks` text NOT NULL,
	`updated_at` integer NOT NULL
);
