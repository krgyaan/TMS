ALTER TABLE "project_payment_requests" ADD COLUMN "actual_tds_deducted" numeric(14,2) DEFAULT 0;
CREATE INDEX IF NOT EXISTS "idx_pr_actual_tds" ON "project_payment_requests" ("actual_tds_deducted");