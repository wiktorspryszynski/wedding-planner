CREATE TABLE `activity_log` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer,
	`entity` text NOT NULL,
	`entity_id` integer,
	`action` text NOT NULL,
	`summary` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE TABLE `budget_categories` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`planned` integer DEFAULT 0 NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `budget_categories_name_unique` ON `budget_categories` (`name`);--> statement-breakpoint
CREATE TABLE `expenses` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`category_id` integer NOT NULL,
	`vendor_id` integer,
	`title` text NOT NULL,
	`planned` integer DEFAULT 0 NOT NULL,
	`actual` integer,
	`paid_by` text DEFAULT 'us' NOT NULL,
	`notes` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`category_id`) REFERENCES `budget_categories`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`vendor_id`) REFERENCES `vendors`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE TABLE `guest_tag_links` (
	`guest_id` integer NOT NULL,
	`tag_id` integer NOT NULL,
	PRIMARY KEY(`guest_id`, `tag_id`),
	FOREIGN KEY (`guest_id`) REFERENCES `guests`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`tag_id`) REFERENCES `guest_tags`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `guest_tags` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `guest_tags_name_unique` ON `guest_tags` (`name`);--> statement-breakpoint
CREATE TABLE `guests` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`household_id` integer,
	`first_name` text NOT NULL,
	`last_name` text DEFAULT '' NOT NULL,
	`side` text DEFAULT 'both' NOT NULL,
	`type` text DEFAULT 'adult' NOT NULL,
	`rsvp` text DEFAULT 'pending' NOT NULL,
	`diet` text,
	`allergies` text,
	`needs_accommodation` integer DEFAULT false NOT NULL,
	`needs_transport` integer DEFAULT false NOT NULL,
	`table_id` integer,
	`seat_no` integer,
	`phone` text,
	`notes` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`household_id`) REFERENCES `households`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`table_id`) REFERENCES `tables`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE TABLE `households` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`address` text,
	`invite_sent_at` text,
	`rsvp_token` text,
	`notes` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `households_name_unique` ON `households` (`name`);--> statement-breakpoint
CREATE UNIQUE INDEX `households_rsvp_token_unique` ON `households` (`rsvp_token`);--> statement-breakpoint
CREATE TABLE `payments` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`expense_id` integer NOT NULL,
	`label` text,
	`amount` integer NOT NULL,
	`due_date` text,
	`paid_at` text,
	FOREIGN KEY (`expense_id`) REFERENCES `expenses`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `settings` (
	`id` integer PRIMARY KEY NOT NULL,
	`wedding_date` text,
	`venue` text,
	`total_budget` integer DEFAULT 0 NOT NULL,
	`cost_per_guest` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE `tables` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`shape` text DEFAULT 'round' NOT NULL,
	`capacity` integer DEFAULT 8 NOT NULL,
	`pos_x` integer DEFAULT 40 NOT NULL,
	`pos_y` integer DEFAULT 40 NOT NULL
);
--> statement-breakpoint
CREATE TABLE `tasks` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`title` text NOT NULL,
	`description` text,
	`due_date` text,
	`assignee_id` integer,
	`status` text DEFAULT 'todo' NOT NULL,
	`vendor_id` integer,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`assignee_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`vendor_id`) REFERENCES `vendors`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`login` text NOT NULL,
	`name` text NOT NULL,
	`password_hash` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_login_unique` ON `users` (`login`);--> statement-breakpoint
CREATE TABLE `vendors` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`category` text NOT NULL,
	`name` text NOT NULL,
	`contact_person` text,
	`phone` text,
	`email` text,
	`website` text,
	`status` text DEFAULT 'research' NOT NULL,
	`price_quote` integer,
	`contract_signed_at` text,
	`notes` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL
);
