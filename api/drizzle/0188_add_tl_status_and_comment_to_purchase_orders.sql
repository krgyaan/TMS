ALTER TABLE "purchase_orders" ADD COLUMN IF NOT EXISTS "tl_status" smallint NOT NULL DEFAULT 0;--> statement-breakpoint
ALTER TABLE "purchase_orders" ADD COLUMN IF NOT EXISTS "tl_comment" text;
