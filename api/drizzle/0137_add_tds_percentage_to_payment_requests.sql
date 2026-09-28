ALTER TABLE "project_payment_requests" ADD COLUMN "tds_percentage" numeric(5, 2);--> statement-breakpoint
CREATE INDEX "idx_pr_tds_percentage" ON "project_payment_requests" ("tds_percentage");
