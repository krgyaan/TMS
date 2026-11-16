
-- Accounts Form (BG) 2 - after BG creation. Two new uploads captured when the
-- issued BG is recorded: the BG document itself and the signed covering letter.
-- (Courier dispatch was moved to the BG create form, so nothing is reused here.)

ALTER TABLE instrument_bg_details ADD COLUMN IF NOT EXISTS bg_upload varchar(500);
ALTER TABLE instrument_bg_details ADD COLUMN IF NOT EXISTS bg_signed_covering_letter varchar(500);
