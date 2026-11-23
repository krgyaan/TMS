ALTER TABLE "purchase_orders" ADD COLUMN IF NOT EXISTS "tl_status" smallint NOT NULL DEFAULT 0;--> statement-breakpoint
ALTER TABLE "purchase_orders" ADD COLUMN IF NOT EXISTS "tl_comment" text;--> statement-breakpoint
ALTER TABLE "purchase_orders" ADD COLUMN IF NOT EXISTS "tl_feedback" jsonb;--> statement-breakpoint
ALTER TABLE "vendor_work_orders" ADD COLUMN IF NOT EXISTS "tl_status" smallint NOT NULL DEFAULT 0;--> statement-breakpoint
ALTER TABLE "vendor_work_orders" ADD COLUMN IF NOT EXISTS "tl_comment" text;--> statement-breakpoint
ALTER TABLE "vendor_work_orders" ADD COLUMN IF NOT EXISTS "tl_feedback" jsonb;--> statement-breakpoint
UPDATE "purchase_orders" SET "tl_status" = 1 WHERE "po_approved" = true AND "tl_status" = 0;--> statement-breakpoint
UPDATE "vendor_work_orders" SET "tl_status" = 1 WHERE "wo_approved" = true AND "tl_status" = 0;
