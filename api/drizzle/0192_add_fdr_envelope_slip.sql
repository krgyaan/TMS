-- Envelope slip for FDR dispatch (generated with the create-request mail)
ALTER TABLE "instrument_fdr_details" ADD COLUMN IF NOT EXISTS "envelope_slip" varchar(500);
