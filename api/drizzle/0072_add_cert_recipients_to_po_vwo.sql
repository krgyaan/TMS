ALTER TABLE "purchase_orders" ADD COLUMN "cert_recipients" jsonb NOT NULL DEFAULT '[]'::jsonb;--> statement-breakpoint
ALTER TABLE "vendor_work_orders" ADD COLUMN "cert_recipients" jsonb NOT NULL DEFAULT '[]'::jsonb;--> statement-breakpoint

