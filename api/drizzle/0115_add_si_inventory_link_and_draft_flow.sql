-- Migration: Sale invoice — PO inventory link + draft approval workflow fields
-- Adds purchase_order_product_id to sale_invoice_items so PO item qty can be
-- tracked against invoiced qty, plus dispatch details, PDF versions and
-- approval fields for the draft -> approved -> invoiced workflow.

ALTER TABLE "sale_invoice_items"
    ADD COLUMN "purchase_order_product_id" bigint REFERENCES "purchase_order_products"("id") ON DELETE SET NULL,
    ADD COLUMN "unit" varchar(20),
    ADD COLUMN "hsn_sac" varchar(100);

CREATE INDEX IF NOT EXISTS "idx_sii_purchase_order_product_id" ON "sale_invoice_items" ("purchase_order_product_id");

ALTER TABLE "sale_invoices"
    ADD COLUMN "dispatch_from_name" varchar(255),
    ADD COLUMN "dispatch_from_address" text,
    ADD COLUMN "dispatch_from_gst" varchar(15),
    ADD COLUMN "dispatch_vehicle_no" varchar(50),
    ADD COLUMN "dispatch_lr_no" varchar(100),
    ADD COLUMN "dispatch_to_name" varchar(255),
    ADD COLUMN "dispatch_to_address" text,
    ADD COLUMN "dispatch_to_gst" varchar(15),
    ADD COLUMN "generated_pdf_versions" jsonb DEFAULT '{}',
    ADD COLUMN "approved_by" bigint,
    ADD COLUMN "approved_at" timestamptz,
    ADD COLUMN "changes_remark" text;
