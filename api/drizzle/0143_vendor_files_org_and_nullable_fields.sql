-- 1. Files belong to the vendor organisation (not the person/vendor row).
ALTER TABLE "vendor_files" ADD COLUMN IF NOT EXISTS "org_id" bigint;

UPDATE "vendor_files" vf
SET "org_id" = v."org_id"
FROM "vendors" v
WHERE vf."vendor_id" = v."id" AND v."org_id" IS NOT NULL AND vf."org_id" IS NULL;

DELETE FROM "vendor_files" WHERE "org_id" IS NULL;

ALTER TABLE "vendor_files" DROP COLUMN IF EXISTS "vendor_id";
ALTER TABLE "vendor_files" ALTER COLUMN "org_id" SET NOT NULL;

-- 2. PO/VWO seller creation stores NULL for missing fields.
ALTER TABLE "vendors" ALTER COLUMN "name" DROP NOT NULL;
ALTER TABLE "vendors" ALTER COLUMN "email" DROP NOT NULL;
ALTER TABLE "vendors" ALTER COLUMN "mobile" DROP NOT NULL;
ALTER TABLE "vendor_gsts" ALTER COLUMN "gst_state" DROP NOT NULL;
ALTER TABLE "vendor_gsts" ALTER COLUMN "gst_no" DROP NOT NULL;
