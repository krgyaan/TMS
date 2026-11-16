
-- DOCX letters generated automatically when the BG create-request mail is sent:
-- the covering letter and the prefilled AU Bank application format.
-- Until now these were only attached to the mail and never persisted.

ALTER TABLE instrument_bg_details ADD COLUMN IF NOT EXISTS cover_letter_docx varchar(500);
ALTER TABLE instrument_bg_details ADD COLUMN IF NOT EXISTS prefilled_app_docx varchar(500);
