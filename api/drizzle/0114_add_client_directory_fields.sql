ALTER TABLE "client_directory" ADD COLUMN "designation" varchar(255);--> statement-breakpoint
ALTER TABLE "client_directory" ADD COLUMN "address" jsonb;--> statement-breakpoint
ALTER TABLE "client_directory" ADD COLUMN "gifting_tier" varchar(10);--> statement-breakpoint
ALTER TABLE "client_directory" ADD COLUMN "remarks" jsonb;
