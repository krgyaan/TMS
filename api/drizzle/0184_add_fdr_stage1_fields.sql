ALTER TABLE "instrument_fdr_details" ADD COLUMN IF NOT EXISTS "prefilled_signed_fdr" text;
ALTER TABLE "instrument_fdr_details" ADD COLUMN IF NOT EXISTS "upload_documents" text;
ALTER TABLE "instrument_fdr_details" ADD COLUMN IF NOT EXISTS "bank_mail_ids" jsonb;
ALTER TABLE "instrument_fdr_details" ADD COLUMN IF NOT EXISTS "bank_mail_ids_cc" jsonb;
