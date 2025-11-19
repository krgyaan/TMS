CREATE TYPE "public"."emd_mode" AS ENUM('BT', 'POP', 'DD', 'FDR', 'PBG', 'SB');--> statement-breakpoint
CREATE TYPE "public"."emd_required" AS ENUM('YES', 'NO', 'EXEMPT');--> statement-breakpoint
CREATE TYPE "public"."fee_mode" AS ENUM('DD', 'POP', 'BT');--> statement-breakpoint
CREATE TYPE "public"."payment_terms" AS ENUM('ADVANCE', 'AGAINST_DELIVERY', 'CREDIT');--> statement-breakpoint
CREATE TYPE "public"."reverse_auction" AS ENUM('YES', 'NO');--> statement-breakpoint
CREATE TYPE "public"."sd_mode" AS ENUM('NA', 'DD', 'DEDUCTION', 'FDR', 'PBG', 'SB');--> statement-breakpoint
CREATE TYPE "public"."yes_no" AS ENUM('YES', 'NO');--> statement-breakpoint
CREATE TABLE "tender_financial_documents" (
	"id" serial PRIMARY KEY NOT NULL,
	"tender_id" bigint NOT NULL,
	"document_name" varchar(255) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tender_pqc_documents" (
	"id" serial PRIMARY KEY NOT NULL,
	"tender_id" bigint NOT NULL,
	"document_name" varchar(255) NOT NULL,
	"auto_attached" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tender_technical_documents" (
	"id" serial PRIMARY KEY NOT NULL,
	"tender_id" bigint NOT NULL,
	"document_name" varchar(255) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "tender_documents" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "tender_documents" CASCADE;--> statement-breakpoint
ALTER TABLE "tender_clients" RENAME COLUMN "designation" TO "client_designation";--> statement-breakpoint
ALTER TABLE "tender_clients" RENAME COLUMN "mobile" TO "client_mobile";--> statement-breakpoint
ALTER TABLE "tender_clients" RENAME COLUMN "email" TO "client_email";--> statement-breakpoint
ALTER TABLE "tender_information" RENAME COLUMN "recommendation_by_te" TO "te_recommendation";--> statement-breakpoint
ALTER TABLE "tender_information" ALTER COLUMN "emd_required" SET DATA TYPE "public"."emd_required" USING "emd_required"::"public"."emd_required";--> statement-breakpoint
ALTER TABLE "tender_information" ALTER COLUMN "commercial_evaluation" SET DATA TYPE "public"."yes_no" USING "commercial_evaluation"::"public"."yes_no";--> statement-breakpoint
ALTER TABLE "tender_information" ALTER COLUMN "maf_required" SET DATA TYPE "public"."yes_no" USING "maf_required"::"public"."yes_no";--> statement-breakpoint
ALTER TABLE "tender_information" ALTER COLUMN "pbg_percentage" SET DATA TYPE numeric(5, 2);--> statement-breakpoint
ALTER TABLE "tender_information" ALTER COLUMN "max_ld_percentage" SET DATA TYPE numeric(5, 2);--> statement-breakpoint
ALTER TABLE "tender_information" ALTER COLUMN "physical_docs_required" SET DATA TYPE "public"."yes_no" USING "physical_docs_required"::"public"."yes_no";--> statement-breakpoint
ALTER TABLE "tender_information" ALTER COLUMN "physical_docs_deadline" SET DATA TYPE timestamp;--> statement-breakpoint
ALTER TABLE "tender_information" ALTER COLUMN "created_at" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "tender_information" ALTER COLUMN "updated_at" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "tender_clients" ADD COLUMN "created_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "tender_clients" ADD COLUMN "updated_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "tender_information" ADD COLUMN "te_rejection_reason" integer;--> statement-breakpoint
ALTER TABLE "tender_information" ADD COLUMN "te_rejection_remarks" text;--> statement-breakpoint
ALTER TABLE "tender_information" ADD COLUMN "tender_fee_amount" numeric(12, 2);--> statement-breakpoint
ALTER TABLE "tender_information" ADD COLUMN "tender_fee_mode" "fee_mode";--> statement-breakpoint
ALTER TABLE "tender_information" ADD COLUMN "emd_mode" "emd_mode";--> statement-breakpoint
ALTER TABLE "tender_information" ADD COLUMN "reverse_auction_applicable" "reverse_auction";--> statement-breakpoint
ALTER TABLE "tender_information" ADD COLUMN "payment_terms_supply" "payment_terms";--> statement-breakpoint
ALTER TABLE "tender_information" ADD COLUMN "payment_terms_installation" "payment_terms";--> statement-breakpoint
ALTER TABLE "tender_information" ADD COLUMN "pbg_required" "yes_no";--> statement-breakpoint
ALTER TABLE "tender_information" ADD COLUMN "security_deposit_mode" "sd_mode";--> statement-breakpoint
ALTER TABLE "tender_information" ADD COLUMN "security_deposit_percentage" numeric(5, 2);--> statement-breakpoint
ALTER TABLE "tender_information" ADD COLUMN "ld_percentage_per_week" numeric(5, 2);--> statement-breakpoint
ALTER TABLE "tender_information" ADD COLUMN "technical_eligibility_age_years" integer;--> statement-breakpoint
ALTER TABLE "tender_information" ADD COLUMN "order_value_1" numeric(12, 2);--> statement-breakpoint
ALTER TABLE "tender_information" ADD COLUMN "order_value_2" numeric(12, 2);--> statement-breakpoint
ALTER TABLE "tender_information" ADD COLUMN "order_value_3" numeric(12, 2);--> statement-breakpoint
ALTER TABLE "tender_information" ADD COLUMN "avg_annual_turnover_required" "yes_no";--> statement-breakpoint
ALTER TABLE "tender_information" ADD COLUMN "avg_annual_turnover_value" numeric(12, 2);--> statement-breakpoint
ALTER TABLE "tender_information" ADD COLUMN "working_capital_required" "yes_no";--> statement-breakpoint
ALTER TABLE "tender_information" ADD COLUMN "working_capital_value" numeric(12, 2);--> statement-breakpoint
ALTER TABLE "tender_information" ADD COLUMN "solvency_certificate_required" "yes_no";--> statement-breakpoint
ALTER TABLE "tender_information" ADD COLUMN "solvency_certificate_value" numeric(12, 2);--> statement-breakpoint
ALTER TABLE "tender_information" ADD COLUMN "net_worth_required" "yes_no";--> statement-breakpoint
ALTER TABLE "tender_information" ADD COLUMN "net_worth_value" numeric(12, 2);--> statement-breakpoint
ALTER TABLE "tender_information" ADD COLUMN "technical_eligible" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "tender_information" ADD COLUMN "financial_eligible" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "tender_information" ADD COLUMN "rejection_remark" text;--> statement-breakpoint
CREATE INDEX "tender_fin_docs_tender_id_idx" ON "tender_financial_documents" USING btree ("tender_id");--> statement-breakpoint
CREATE INDEX "tender_pqc_docs_tender_id_idx" ON "tender_pqc_documents" USING btree ("tender_id");--> statement-breakpoint
CREATE INDEX "tender_tech_docs_tender_id_idx" ON "tender_technical_documents" USING btree ("tender_id");--> statement-breakpoint
CREATE INDEX "tender_clients_tender_id_idx" ON "tender_clients" USING btree ("tender_id");--> statement-breakpoint
CREATE INDEX "tender_info_tender_id_idx" ON "tender_information" USING btree ("tender_id");--> statement-breakpoint
CREATE INDEX "tender_info_created_at_idx" ON "tender_information" USING btree ("created_at");--> statement-breakpoint
ALTER TABLE "tender_information" DROP COLUMN "recommendation_reason";--> statement-breakpoint
ALTER TABLE "tender_information" DROP COLUMN "recommendation_remarks";--> statement-breakpoint
ALTER TABLE "tender_information" DROP COLUMN "processing_fees";--> statement-breakpoint
ALTER TABLE "tender_information" DROP COLUMN "processing_fees_form";--> statement-breakpoint
ALTER TABLE "tender_information" DROP COLUMN "tender_fees";--> statement-breakpoint
ALTER TABLE "tender_information" DROP COLUMN "tender_fees_form";--> statement-breakpoint
ALTER TABLE "tender_information" DROP COLUMN "emd";--> statement-breakpoint
ALTER TABLE "tender_information" DROP COLUMN "tender_value";--> statement-breakpoint
ALTER TABLE "tender_information" DROP COLUMN "emd_form";--> statement-breakpoint
ALTER TABLE "tender_information" DROP COLUMN "ra_applicable";--> statement-breakpoint
ALTER TABLE "tender_information" DROP COLUMN "delivery_inclusive_figure";--> statement-breakpoint
ALTER TABLE "tender_information" DROP COLUMN "pbg_form";--> statement-breakpoint
ALTER TABLE "tender_information" DROP COLUMN "sd_form";--> statement-breakpoint
ALTER TABLE "tender_information" DROP COLUMN "sd_percentage";--> statement-breakpoint
ALTER TABLE "tender_information" DROP COLUMN "ld_per_week_percentage";--> statement-breakpoint
ALTER TABLE "tender_information" DROP COLUMN "eligibility_criterion";--> statement-breakpoint
ALTER TABLE "tender_information" DROP COLUMN "eligibility_age_years";--> statement-breakpoint
ALTER TABLE "tender_information" DROP COLUMN "financial_criterion";--> statement-breakpoint
ALTER TABLE "tender_information" DROP COLUMN "work_value_1";--> statement-breakpoint
ALTER TABLE "tender_information" DROP COLUMN "work_value_2";--> statement-breakpoint
ALTER TABLE "tender_information" DROP COLUMN "work_value_3";--> statement-breakpoint
ALTER TABLE "tender_information" DROP COLUMN "annual_avg_turnover";--> statement-breakpoint
ALTER TABLE "tender_information" DROP COLUMN "working_capital";--> statement-breakpoint
ALTER TABLE "tender_information" DROP COLUMN "net_worth";--> statement-breakpoint
ALTER TABLE "tender_information" DROP COLUMN "solvency_certificate";--> statement-breakpoint
ALTER TABLE "tender_information" DROP COLUMN "pqc_documents";--> statement-breakpoint
ALTER TABLE "tender_information" DROP COLUMN "commercial_eligibility_documents";--> statement-breakpoint
ALTER TABLE "tender_information" DROP COLUMN "documents_submitted";--> statement-breakpoint
ALTER TABLE "tender_information" DROP COLUMN "client_organisation";--> statement-breakpoint
ALTER TABLE "tender_information" DROP COLUMN "courier_address";--> statement-breakpoint
ALTER TABLE "tender_information" ADD CONSTRAINT "tender_information_tender_id_unique" UNIQUE("tender_id");