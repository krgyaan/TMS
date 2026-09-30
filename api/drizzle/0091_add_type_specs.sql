ALTER TABLE "hrms_employee_assets" ADD COLUMN IF NOT EXISTS "type_specs" jsonb DEFAULT '{}'::jsonb NOT NULL;
