-- Persist the selected seller GST, vendor contact person and ship-to party
-- alongside the snapshot fields already stored on each PO / VWO. The document
-- columns stay the source for display/print; these ids only make the picker
-- selection restorable when the document is edited.
--
-- Apply with: psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f drizzle/0163_add_party_ids_to_po_and_vwo.sql

ALTER TABLE "purchase_orders"
    ADD COLUMN IF NOT EXISTS "seller_gst_id" bigint REFERENCES "vendor_gsts"("id") ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS "vendor_person_id" bigint REFERENCES "vendors"("id") ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS "ship_to_party_id" bigint REFERENCES "project_parties"("id") ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS "idx_po_seller_gst_id" ON "purchase_orders" ("seller_gst_id");
CREATE INDEX IF NOT EXISTS "idx_po_vendor_person_id" ON "purchase_orders" ("vendor_person_id");
CREATE INDEX IF NOT EXISTS "idx_po_ship_to_party_id" ON "purchase_orders" ("ship_to_party_id");

ALTER TABLE "vendor_work_orders"
    ADD COLUMN IF NOT EXISTS "seller_gst_id" bigint REFERENCES "vendor_gsts"("id") ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS "vendor_person_id" bigint REFERENCES "vendors"("id") ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS "ship_to_party_id" bigint REFERENCES "project_parties"("id") ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS "idx_vwo_seller_gst_id" ON "vendor_work_orders" ("seller_gst_id");
CREATE INDEX IF NOT EXISTS "idx_vwo_vendor_person_id" ON "vendor_work_orders" ("vendor_person_id");
CREATE INDEX IF NOT EXISTS "idx_vwo_ship_to_party_id" ON "vendor_work_orders" ("ship_to_party_id");
