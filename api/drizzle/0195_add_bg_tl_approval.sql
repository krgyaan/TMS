DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'instrument_bg_details'
          AND column_name = 'tl_approval_status'
    ) THEN
        ALTER TABLE "instrument_bg_details" ADD COLUMN "tl_approval_status" varchar(20) NOT NULL DEFAULT 'PENDING';
        UPDATE "instrument_bg_details" SET "tl_approval_status" = 'APPROVED';
    END IF;
END $$;

ALTER TABLE "instrument_bg_details" ADD COLUMN IF NOT EXISTS "tl_approval_remarks" text;
ALTER TABLE "instrument_bg_details" ADD COLUMN IF NOT EXISTS "tl_rejected_remarks" text;
ALTER TABLE "instrument_bg_details" ADD COLUMN IF NOT EXISTS "tl_incomplete_remarks" text;
ALTER TABLE "instrument_bg_details" ADD COLUMN IF NOT EXISTS "tl_approved_by" integer;
ALTER TABLE "instrument_bg_details" ADD COLUMN IF NOT EXISTS "tl_approved_at" timestamp with time zone;

CREATE INDEX IF NOT EXISTS "instrument_bg_details_tl_approval_status_idx" ON "instrument_bg_details" ("tl_approval_status");
