ALTER TABLE "instrument_bg_details" DROP COLUMN IF EXISTS "stamp_charge";


ALTER TABLE "instrument_bg_details" ADD COLUMN IF NOT EXISTS "bg_bank_acc_name" varchar(255);