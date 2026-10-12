

ALTER TABLE "instrument_bg_details"
  ADD COLUMN IF NOT EXISTS "approved_fdr_per"  numeric(15, 2),
  ADD COLUMN IF NOT EXISTS "bank_mail_ids"    jsonb,
  ADD COLUMN IF NOT EXISTS "bank_mail_ids_cc" jsonb;