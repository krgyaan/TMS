
ALTER TABLE instrument_bg_details ADD COLUMN IF NOT EXISTS unique_code varchar(255);
ALTER TABLE instrument_bg_details ADD COLUMN IF NOT EXISTS unique_advice_message text;
