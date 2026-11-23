ALTER TABLE "instrument_fdr_details"
    ADD COLUMN IF NOT EXISTS "cover_letter_path" varchar(500),
    ADD COLUMN IF NOT EXISTS "authorization_letter_path" varchar(500),
    ADD COLUMN IF NOT EXISTS "request_letter_path" varchar(500),
    ADD COLUMN IF NOT EXISTS "fdr_form_path" varchar(500);
