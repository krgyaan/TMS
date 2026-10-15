-- Extra charges (Freight, Security, etc.) attached to a PO or VWO.
-- Managed exclusively from the Project Purchase Invoice form; rolled into the
-- order grand total and shown as a separate "Other Charges" block on PO/VWO PDFs.

CREATE TABLE IF NOT EXISTS "order_extra_charges" (
    "id" bigserial NOT NULL PRIMARY KEY,
    "project_id" bigint NOT NULL,
    "purchase_order_id" bigint REFERENCES "purchase_orders"("id") ON DELETE CASCADE,
    "vendor_work_order_id" bigint REFERENCES "vendor_work_orders"("id") ON DELETE CASCADE,
    "label" varchar(100) NOT NULL,
    "gst_rate" numeric(5,2) NOT NULL DEFAULT 0,
    "taxable_amount" numeric(14,2) NOT NULL,
    "gst_amount" numeric(14,2) NOT NULL DEFAULT 0,
    "total_amount" numeric(14,2) NOT NULL,
    "created_at" timestamp with time zone NOT NULL DEFAULT now(),
    "updated_at" timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_oec_purchase_order_id" ON "order_extra_charges" ("purchase_order_id");
CREATE INDEX IF NOT EXISTS "idx_oec_vendor_work_order_id" ON "order_extra_charges" ("vendor_work_order_id");
CREATE INDEX IF NOT EXISTS "idx_oec_project_id" ON "order_extra_charges" ("project_id");
