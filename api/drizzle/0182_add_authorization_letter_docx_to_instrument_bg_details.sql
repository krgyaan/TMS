
-- Authorization letter attached to the BG create-request mail: authorizes
-- named persons to collect the BG from the AU Bank branch.
ALTER TABLE instrument_bg_details ADD COLUMN IF NOT EXISTS authorization_letter_docx varchar(500);

-- Envelope slip upload for BG dispatch. Column only for now; the capture logic
-- will be added separately.

ALTER TABLE instrument_bg_details ADD COLUMN IF NOT EXISTS envelope_slip varchar(500);
