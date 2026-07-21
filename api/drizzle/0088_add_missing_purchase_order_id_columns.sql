DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'project_purchase_invoices' AND column_name = 'purchase_order_id'
    ) THEN
        ALTER TABLE "project_purchase_invoices" ADD COLUMN "purchase_order_id" bigint;
    END IF;
END $$;--> statement-breakpoint
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'purchase_order_products' AND column_name = 'purchase_order_id'
    ) THEN
        ALTER TABLE "purchase_order_products" ADD COLUMN "purchase_order_id" bigint;
    END IF;
END $$;--> statement-breakpoint
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'project_payment_requests' AND column_name = 'purchase_order_id'
    ) THEN
        ALTER TABLE "project_payment_requests" ADD COLUMN "purchase_order_id" bigint;
    END IF;
END $$;--> statement-breakpoint
