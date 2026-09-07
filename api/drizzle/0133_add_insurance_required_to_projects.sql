-- 0133: Add insurance_required toggle to projects table
-- When true (default), PO/VWO/PR creation requires active WC insurance.
-- When false, WC check is skipped; remark field captures the reason.

ALTER TABLE "projects" ADD COLUMN "insurance_required" boolean DEFAULT true NOT NULL;
ALTER TABLE "projects" ADD COLUMN "insurance_required_remark" varchar(500);
