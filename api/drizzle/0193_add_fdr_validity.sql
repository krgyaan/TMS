-- Separate column for the Stage 2 "FDR Validity" field.
-- Previously this value overwrote instrument_fdr_details.fdr_expiry_date.

ALTER TABLE "instrument_fdr_details" ADD COLUMN IF NOT EXISTS "fdr_validity" date;


