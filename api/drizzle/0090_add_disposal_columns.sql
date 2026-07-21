ALTER TABLE "hrms_employee_assets" 
  ADD COLUMN "disposal_date" date,
  ADD COLUMN "disposal_type" varchar(50),
  ADD COLUMN "disposal_reason" text,
  ADD COLUMN "disposal_amount" numeric(12, 2),
  ADD COLUMN "disposal_approved_by" varchar(255);

ALTER TABLE "hrms_asset_tracking_history" 
  ADD COLUMN "disposal_date" date,
  ADD COLUMN "disposal_type" varchar(50),
  ADD COLUMN "disposal_reason" text,
  ADD COLUMN "disposal_amount" numeric(12, 2),
  ADD COLUMN "disposal_approved_by" varchar(255);
