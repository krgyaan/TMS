-- Two-step Sale Invoice form: transporters master + sale invoice mapping columns.
--
-- 1. New `transporters` master table (selectable / add-new in Sale Invoice step 2,
--    snapshotted into sale_invoices.transporter_details).
-- 2. sale_invoices: link the picked WO billing/shipping address rows, transporter,
--    and step-3 totals fields (freight / other_charges / round_off).
-- 3. sale_invoice_items: line_item_sr_no groups each invoice row under a
--    WO Billing BOQ line item (one BOQ line -> N PO-item rows).
--
-- Apply with: psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f drizzle/0161_sale_invoice_step_form_and_transporters.sql

-- ---------------------------------------------------------------------------
-- 1. Transporters master
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS "transporters" (
    "id" bigserial NOT NULL PRIMARY KEY,
    "name" varchar(255) NOT NULL,
    "gst_no" varchar(15),
    "phone" varchar(50),
    "address" text,
    "status" boolean NOT NULL DEFAULT true,
    "created_at" timestamp with time zone NOT NULL DEFAULT now(),
    "updated_at" timestamp with time zone NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- 2. sale_invoices: address links, transporter, totals
-- ---------------------------------------------------------------------------

ALTER TABLE "sale_invoices"
    ADD COLUMN IF NOT EXISTS "billing_address_id" bigint REFERENCES "wo_billing_addresses"("id") ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS "shipping_address_id" bigint REFERENCES "wo_shipping_addresses"("id") ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS "transporter_id" bigint REFERENCES "transporters"("id") ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS "transporter_details" jsonb,
    ADD COLUMN IF NOT EXISTS "freight" numeric(20,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS "other_charges" numeric(20,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS "round_off" numeric(20,2) DEFAULT 0;

-- ---------------------------------------------------------------------------
-- 3. sale_invoice_items: WO Billing BOQ line-item grouping
-- ---------------------------------------------------------------------------

ALTER TABLE "sale_invoice_items"
    ADD COLUMN IF NOT EXISTS "line_item_sr_no" integer;
