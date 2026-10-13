
-- Store approx value as a real number (15,2), matching tender_infos.gst_values
ALTER TABLE "lead_enquiries"
  ALTER COLUMN "approx_value" TYPE numeric(15,2)
  USING "approx_value"::numeric;
