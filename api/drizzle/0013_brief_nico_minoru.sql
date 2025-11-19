ALTER TABLE "tender_pqc_documents" DISABLE ROW LEVEL SECURITY;
--> statement-breakpoint

DROP TABLE "tender_pqc_documents" CASCADE;
--> statement-breakpoint

ALTER TABLE "tender_information"
  RENAME COLUMN "delivery_time_installation" TO "delivery_time_installation_days";
--> statement-breakpoint

ALTER TABLE "tender_information"
  RENAME COLUMN "rejection_remark" TO "avg_annual_turnover_type";
--> statement-breakpoint

DROP INDEX "tender_info_created_at_idx";
--> statement-breakpoint

ALTER TABLE "tender_information"
  ALTER COLUMN "te_recommendation" SET DATA TYPE varchar(5);
--> statement-breakpoint

ALTER TABLE "tender_information"
  ALTER COLUMN "emd_required" SET DATA TYPE varchar(10)
  USING "emd_required"::text;
--> statement-breakpoint

ALTER TABLE "tender_information"
  ALTER COLUMN "reverse_auction_applicable" SET DATA TYPE varchar(5)
  USING "reverse_auction_applicable"::text;
--> statement-breakpoint

ALTER TABLE "tender_information"
  ALTER COLUMN "physical_docs_required" SET DATA TYPE varchar(5)
  USING "physical_docs_required"::text;
--> statement-breakpoint

ALTER TABLE "tender_information"
  ALTER COLUMN "maf_required" SET DATA TYPE varchar(30)
  USING "maf_required"::text;
--> statement-breakpoint

ALTER TABLE "tender_information"
  ALTER COLUMN "commercial_evaluation" SET DATA TYPE varchar(50)
  USING "commercial_evaluation"::text;
--> statement-breakpoint

ALTER TABLE "tender_information"
  ALTER COLUMN "payment_terms_supply"
  SET DATA TYPE text
  USING "payment_terms_supply"::text;
--> statement-breakpoint

ALTER TABLE "tender_information"
  ALTER COLUMN "payment_terms_supply"
  SET DATA TYPE integer
  USING NULLIF("payment_terms_supply", '')::integer;
--> statement-breakpoint

ALTER TABLE "tender_information"
  ALTER COLUMN "payment_terms_installation"
  SET DATA TYPE text
  USING "payment_terms_installation"::text;
--> statement-breakpoint

ALTER TABLE "tender_information"
  ALTER COLUMN "payment_terms_installation"
  SET DATA TYPE integer
  USING NULLIF("payment_terms_installation", '')::integer;
--> statement-breakpoint

ALTER TABLE "tender_information"
  ALTER COLUMN "emd_mode"
  SET DATA TYPE varchar(20);
--> statement-breakpoint

ALTER TABLE "tender_information"
  ALTER COLUMN "tender_fee_mode"
  SET DATA TYPE varchar(20);
--> statement-breakpoint

ALTER TABLE "tender_information"
  ADD COLUMN "processing_fee_amount" numeric(12, 2);
--> statement-breakpoint

ALTER TABLE "tender_information"
  ADD COLUMN "processing_fee_mode" varchar(20);
--> statement-breakpoint

ALTER TABLE "tender_information"
  ADD COLUMN "delivery_time_installation_inclusive" boolean;
--> statement-breakpoint

ALTER TABLE "tender_information"
  ADD COLUMN "pbg_in_form_of" varchar(20);
--> statement-breakpoint

ALTER TABLE "tender_information"
  ADD COLUMN "sd_in_form_of" varchar(20);
--> statement-breakpoint

ALTER TABLE "tender_information"
  ADD COLUMN "working_capital_type" varchar(20);
--> statement-breakpoint

ALTER TABLE "tender_information"
  ADD COLUMN "solvency_certificate_type" varchar(20);
--> statement-breakpoint

ALTER TABLE "tender_information"
  ADD COLUMN "net_worth_type" varchar(20);
--> statement-breakpoint

ALTER TABLE "tender_information"
  ADD COLUMN "client_organisation" varchar(255);
--> statement-breakpoint

ALTER TABLE "tender_information"
  ADD COLUMN "courier_address" text;
--> statement-breakpoint

ALTER TABLE "tender_information"
  ADD COLUMN "te_final_remark" text;
--> statement-breakpoint

ALTER TABLE "tender_infos" ADD COLUMN "tl_decision" varchar(5);
--> statement-breakpoint

ALTER TABLE "tender_infos" ADD COLUMN "rfq_to_approval" varchar(20);
--> statement-breakpoint

ALTER TABLE "tender_infos" ADD COLUMN "tender_fee_mode" varchar(50);
--> statement-breakpoint

ALTER TABLE "tender_infos" ADD COLUMN "emd_mode" varchar(50);
--> statement-breakpoint

ALTER TABLE "tender_infos" ADD COLUMN "approve_pqr_selection" varchar(5);
--> statement-breakpoint

ALTER TABLE "tender_infos" ADD COLUMN "approve_finance_doc_selection" varchar(5);
--> statement-breakpoint

ALTER TABLE "tender_infos" ADD COLUMN "tender_approval_status" bigint;
--> statement-breakpoint

ALTER TABLE "tender_infos" ADD COLUMN "oem_not_allowed" bigint;
--> statement-breakpoint

ALTER TABLE "tender_infos" ADD COLUMN "tender_approval_remarks" text;
--> statement-breakpoint

ALTER TABLE "tender_infos"
  ADD CONSTRAINT "tender_infos_tender_approval_status_statuses_id_fk"
  FOREIGN KEY ("tender_approval_status") REFERENCES "public"."statuses"("id")
  ON DELETE NO ACTION ON UPDATE NO ACTION;
--> statement-breakpoint

ALTER TABLE "tender_infos"
  ADD CONSTRAINT "tender_infos_oem_not_allowed_organizations_id_fk"
  FOREIGN KEY ("oem_not_allowed") REFERENCES "public"."organizations"("id")
  ON DELETE NO ACTION ON UPDATE NO ACTION;
--> statement-breakpoint

ALTER TABLE "tender_information" DROP COLUMN "pbg_required";
--> statement-breakpoint

ALTER TABLE "tender_information" DROP COLUMN "security_deposit_mode";
--> statement-breakpoint

ALTER TABLE "tender_information" DROP COLUMN "avg_annual_turnover_required";
--> statement-breakpoint

ALTER TABLE "tender_information" DROP COLUMN "working_capital_required";
--> statement-breakpoint

ALTER TABLE "tender_information" DROP COLUMN "solvency_certificate_required";
--> statement-breakpoint

ALTER TABLE "tender_information" DROP COLUMN "net_worth_required";
--> statement-breakpoint

ALTER TABLE "tender_information" DROP COLUMN "technical_eligible";
--> statement-breakpoint

ALTER TABLE "tender_information" DROP COLUMN "financial_eligible";
--> statement-breakpoint

ALTER TABLE "tender_information" DROP COLUMN "te_remark";
--> statement-breakpoint

DROP TYPE "public"."emd_mode";
--> statement-breakpoint

DROP TYPE "public"."emd_required";
--> statement-breakpoint

DROP TYPE "public"."fee_mode";
--> statement-breakpoint

DROP TYPE "public"."payment_terms";
--> statement-breakpoint

DROP TYPE "public"."reverse_auction";
--> statement-breakpoint

DROP TYPE "public"."sd_mode";
--> statement-breakpoint

DROP TYPE "public"."yes_no";
--> statement-breakpoint
