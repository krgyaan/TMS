-- Merge master vendor module with operations PO Parties (Option B).
-- Field mapping: seller details live on vendor tables; PO/VWO store seller_organization_id.

ALTER TABLE "vendor_organizations" ADD COLUMN IF NOT EXISTS "alias" varchar(255);
ALTER TABLE "vendor_organizations" ADD COLUMN IF NOT EXISTS "msme" varchar(50);
ALTER TABLE "vendor_organizations" ADD COLUMN IF NOT EXISTS "pan" varchar(100);

ALTER TABLE "vendors" ADD COLUMN IF NOT EXISTS "contact_person" varchar(255);
ALTER TABLE "vendors" ADD COLUMN IF NOT EXISTS "mobile_number" varchar(20);

-- gstNum -> gstNo (column rename gst_num -> gst_no)
DO $$ BEGIN
    ALTER TABLE "vendor_gsts" RENAME COLUMN "gst_num" TO "gst_no";
EXCEPTION WHEN duplicate_column OR undefined_column THEN NULL;
END $$;

ALTER TABLE "project_parties" ADD COLUMN IF NOT EXISTS "vendor_organization_id" bigint;
ALTER TABLE "purchase_orders" ADD COLUMN IF NOT EXISTS "seller_organization_id" bigint;
ALTER TABLE "vendor_work_orders" ADD COLUMN IF NOT EXISTS "seller_organization_id" bigint;
