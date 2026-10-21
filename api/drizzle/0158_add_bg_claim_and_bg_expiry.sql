ALTER TABLE "instrument_bg_details"
ADD COLUMN IF NOT EXISTS "bg_claim" date,
ADD COLUMN IF NOT EXISTS "bg_expiry_date" date;
