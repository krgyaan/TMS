ALTER TABLE "sale_invoice_items" ADD COLUMN IF NOT EXISTS "discount_percent" numeric(5, 2) NOT NULL DEFAULT '0';
ALTER TABLE "sale_invoice_items" ADD COLUMN IF NOT EXISTS "discount_amount" numeric(20, 2) NOT NULL DEFAULT '0';
