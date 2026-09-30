ALTER TABLE "hrms_employee_assets" 
  ADD COLUMN IF NOT EXISTS "disposal_date" date,
  ADD COLUMN IF NOT EXISTS "disposal_type" varchar(50),
  ADD COLUMN IF NOT EXISTS "disposal_reason" text,
  ADD COLUMN IF NOT EXISTS "disposal_amount" numeric(12, 2),
  ADD COLUMN IF NOT EXISTS "disposal_approved_by" varchar(255);

ALTER TABLE "hrms_asset_tracking_history" 
  ADD COLUMN IF NOT EXISTS "disposal_date" date,
  ADD COLUMN IF NOT EXISTS "disposal_type" varchar(50),
  ADD COLUMN IF NOT EXISTS "disposal_reason" text,
  ADD COLUMN IF NOT EXISTS "disposal_amount" numeric(12, 2),
  ADD COLUMN IF NOT EXISTS "disposal_approved_by" varchar(255);
