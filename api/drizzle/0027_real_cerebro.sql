CREATE TYPE "public"."instrument_status" AS ENUM('Pending', 'Requested', 'Approved', 'Issued', 'Dispatched', 'Received', 'Returned', 'Cancelled', 'Refunded', 'Encashed', 'Extended');--> statement-breakpoint
CREATE TYPE "public"."payment_purpose" AS ENUM('EMD', 'Tender Fee', 'Processing Fee', 'Security Deposit', 'Performance BG', 'Surety Bond', 'Other Payment');--> statement-breakpoint
CREATE TYPE "public"."payment_request_type" AS ENUM('TMS', 'Other Than TMS', 'Old Entries', 'Other Than Tender');--> statement-breakpoint
CREATE TABLE "instrument_bg_details" (
	"id" serial PRIMARY KEY NOT NULL,
	"instrument_id" integer NOT NULL,
	"bg_no" varchar(100),
	"bg_date" date,
	"validity_date" date,
	"claim_expiry_date" date,
	"beneficiary_name" varchar(500),
	"beneficiary_address" text,
	"bank_name" varchar(300),
	"cash_margin_percent" numeric(6, 2),
	"fdr_margin_percent" numeric(6, 2),
	"stamp_charges" numeric(12, 2),
	"sfms_charges" numeric(12, 2),
	"stamp_charges_deducted" numeric(12, 2),
	"sfms_charges_deducted" numeric(12, 2),
	"other_charges_deducted" numeric(12, 2),
	"extended_amount" numeric(18, 2),
	"extended_validity_date" date,
	"extended_claim_expiry_date" date,
	"extended_bank_name" varchar(300),
	"extension_letter_path" varchar(500),
	"cancellation_letter_path" varchar(500),
	"prefilled_signed_bg" varchar(500)
);
--> statement-breakpoint
CREATE TABLE "instrument_cheque_details" (
	"id" serial PRIMARY KEY NOT NULL,
	"instrument_id" integer NOT NULL,
	"cheque_no" varchar(50),
	"cheque_date" date,
	"bank_name" varchar(300),
	"cheque_image_path" varchar(500),
	"cancelled_image_path" varchar(500)
);
--> statement-breakpoint
CREATE TABLE "instrument_dd_details" (
	"id" serial PRIMARY KEY NOT NULL,
	"instrument_id" integer NOT NULL,
	"dd_no" varchar(100),
	"dd_date" date,
	"bank_name" varchar(300),
	"req_no" varchar(100)
);
--> statement-breakpoint
CREATE TABLE "instrument_fdr_details" (
	"id" serial PRIMARY KEY NOT NULL,
	"instrument_id" integer NOT NULL,
	"fdr_no" varchar(100),
	"fdr_date" date,
	"fdr_source" varchar(200),
	"roi" numeric(6, 2),
	"margin_percent" numeric(6, 2),
	"fdr_purpose" varchar(500)
);
--> statement-breakpoint
CREATE TABLE "instrument_transfer_details" (
	"id" serial PRIMARY KEY NOT NULL,
	"instrument_id" integer NOT NULL,
	"portal_name" varchar(200),
	"account_name" varchar(300),
	"account_number" varchar(50),
	"ifsc" varchar(20),
	"transaction_id" varchar(100),
	"transaction_date" timestamp,
	"payment_method" varchar(50)
);
--> statement-breakpoint
CREATE TABLE "payment_instruments" (
	"id" serial PRIMARY KEY NOT NULL,
	"request_id" integer NOT NULL,
	"instrument_type" "instrument_type" NOT NULL,
	"amount" numeric(18, 2) NOT NULL,
	"favouring" varchar(500),
	"payable_at" varchar(500),
	"issue_date" date,
	"expiry_date" date,
	"validity_date" date,
	"claim_expiry_date" date,
	"instrument_status" "instrument_status" DEFAULT 'Pending',
	"utr" varchar(100),
	"docket_no" varchar(100),
	"courier_address" text,
	"action" integer,
	"courier_deadline" integer,
	"rejection_reason" text,
	"generated_pdf" varchar(500),
	"cancel_pdf" varchar(500),
	"docket_slip" varchar(500),
	"covering_letter" varchar(500),
	"generated_pdfs" text,
	"extension_request_pdf" varchar(500),
	"cancellation_request_pdf" varchar(500),
	"remarks" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "payment_requests" (
	"id" serial PRIMARY KEY NOT NULL,
	"tender_id" integer NOT NULL,
	"type" "payment_request_type" DEFAULT 'TMS',
	"tender_no" varchar(500) DEFAULT 'NA',
	"project_name" varchar(500),
	"purpose" "payment_purpose" NOT NULL,
	"amount_required" numeric(18, 2) NOT NULL,
	"due_date" timestamp,
	"requested_by" varchar(200),
	"status" varchar(50) DEFAULT 'Pending',
	"remarks" text,
	"legacy_emd_id" integer,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
DROP TABLE "emd_bg_details" CASCADE;--> statement-breakpoint
DROP TABLE "emd_bt_portal_details" CASCADE;--> statement-breakpoint
DROP TABLE "emd_cheque_details" CASCADE;--> statement-breakpoint
DROP TABLE "emd_dd_details" CASCADE;--> statement-breakpoint
DROP TABLE "emd_fdr_details" CASCADE;--> statement-breakpoint
DROP TABLE "emd_instruments" CASCADE;--> statement-breakpoint
DROP TABLE "emds" CASCADE;--> statement-breakpoint
ALTER TABLE "payment_instruments" ALTER COLUMN "instrument_type" SET DATA TYPE text;--> statement-breakpoint
DROP TYPE "public"."instrument_type";--> statement-breakpoint
CREATE TYPE "public"."instrument_type" AS ENUM('DD', 'FDR', 'BG', 'Cheque', 'Bank Transfer', 'Portal Payment', 'Surety Bond');--> statement-breakpoint
ALTER TABLE "payment_instruments" ALTER COLUMN "instrument_type" SET DATA TYPE "public"."instrument_type" USING "instrument_type"::"public"."instrument_type";--> statement-breakpoint
DROP TYPE "public"."purpose_type";--> statement-breakpoint
DROP TYPE "public"."status";