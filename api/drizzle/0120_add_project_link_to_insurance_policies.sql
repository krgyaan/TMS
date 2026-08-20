ALTER TABLE "insurance_policies" ADD COLUMN "project_id" bigint;
ALTER TABLE "insurance_policies" ADD COLUMN "payment_request_id" integer;
--> statement-breakpoint
ALTER TABLE "insurance_policies" ADD CONSTRAINT "insurance_policies_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "insurance_policies" ADD CONSTRAINT "insurance_policies_payment_request_id_project_payment_requests_id_fk" FOREIGN KEY ("payment_request_id") REFERENCES "public"."project_payment_requests"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
CREATE UNIQUE INDEX "insurance_policies_payment_request_id_idx" ON "insurance_policies" USING btree ("payment_request_id");