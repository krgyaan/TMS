ALTER TABLE "purchase_orders" ADD COLUMN IF NOT EXISTS "tl_status" boolean;--> statement-breakpoint
ALTER TABLE "purchase_orders" ADD COLUMN IF NOT EXISTS "tl_remark" text;--> statement-breakpoint
ALTER TABLE "vendor_work_orders" ADD COLUMN IF NOT EXISTS "tl_status" boolean;--> statement-breakpoint
ALTER TABLE "vendor_work_orders" ADD COLUMN IF NOT EXISTS "tl_remark" text;
