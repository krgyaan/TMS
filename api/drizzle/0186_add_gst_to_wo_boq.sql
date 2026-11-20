ALTER TABLE "wo_billing_boq" ADD COLUMN IF NOT EXISTS "gst_rate" numeric(5, 2) NOT NULL DEFAULT '0';
ALTER TABLE "wo_billing_boq" ADD COLUMN IF NOT EXISTS "gst_amount" numeric(20, 2);
ALTER TABLE "wo_billing_boq" ADD COLUMN IF NOT EXISTS "total_amount" numeric(20, 2);

UPDATE "wo_billing_boq"
SET "gst_amount" = '0', "total_amount" = COALESCE("amount", '0')
WHERE "total_amount" IS NULL;

ALTER TABLE "wo_buyback_boq" ADD COLUMN IF NOT EXISTS "gst_rate" numeric(5, 2) NOT NULL DEFAULT '0';
ALTER TABLE "wo_buyback_boq" ADD COLUMN IF NOT EXISTS "gst_amount" numeric(20, 2);
ALTER TABLE "wo_buyback_boq" ADD COLUMN IF NOT EXISTS "total_amount" numeric(20, 2);

UPDATE "wo_buyback_boq"
SET "gst_amount" = '0', "total_amount" = COALESCE("amount", '0')
WHERE "total_amount" IS NULL;
