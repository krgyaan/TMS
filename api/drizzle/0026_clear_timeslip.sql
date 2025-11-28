CREATE TYPE "public"."instrument_type" AS ENUM('DD', 'FDR', 'Cheque', 'BG', 'Bank Transfer', 'Portal Payment', 'Surety Bond');--> statement-breakpoint
CREATE TYPE "public"."purpose_type" AS ENUM('EMD', 'Tender Fee', 'Processing Fee', 'Security Deposit', 'Performance BG', 'Mobilization Advance', 'Retention Money', 'Other');--> statement-breakpoint
CREATE TYPE "public"."status" AS ENUM('Pending', 'Requested', 'Approved', 'Issued', 'Dispatched', 'Returned', 'Cancelled', 'Refunded', 'Extended', 'Encashed');--> statement-breakpoint
CREATE TABLE "emd_bg_details" (
	"instrument_id" bigserial PRIMARY KEY NOT NULL,
	"bg_no" varchar(100),
	"bg_date" date,
	"validity_date" date,
	"claim_expiry_date" date,
	"beneficiary_name" varchar(255),
	"beneficiary_address" text,
	"bank_name" varchar(255),
	"margin_percent" numeric(5, 2),
	"fdr_no" varchar(100),
	"stamp_charges" numeric(10, 2),
	"sfms_charges" numeric(10, 2),
	"extension_letter_path" varchar(500),
	"cancellation_letter_path" varchar(500)
);
--> statement-breakpoint
CREATE TABLE "emd_bt_portal_details" (
	"instrument_id" bigserial PRIMARY KEY NOT NULL,
	"portal_name" varchar(255),
	"account_name" varchar(255),
	"account_number" varchar(50),
	"ifsc" varchar(20),
	"transaction_id" varchar(100)
);
--> statement-breakpoint
CREATE TABLE "emd_cheque_details" (
	"instrument_id" bigserial PRIMARY KEY NOT NULL,
	"cheque_no" varchar(50),
	"cheque_date" date,
	"bank_name" varchar(255),
	"cheque_image_path" varchar(500),
	"cancelled_image_path" varchar(500)
);
--> statement-breakpoint
CREATE TABLE "emd_dd_details" (
	"instrument_id" bigserial PRIMARY KEY NOT NULL,
	"dd_no" varchar(100),
	"dd_date" date,
	"bank_name" varchar(255)
);
--> statement-breakpoint
CREATE TABLE "emd_fdr_details" (
	"instrument_id" bigserial PRIMARY KEY NOT NULL,
	"fdr_no" varchar(100),
	"fdr_date" date,
	"fdr_source" varchar(200),
	"roi" numeric(5, 2),
	"margin_percent" numeric(5, 2)
);
--> statement-breakpoint
CREATE TABLE "emd_instruments" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"emd_id" bigint NOT NULL,
	"instrument_type" "instrument_type" NOT NULL,
	"amount" numeric(16, 2) NOT NULL,
	"favouring" varchar(255),
	"payable_at" varchar(255),
	"issue_date" date,
	"expiry_date" date,
	"claim_expiry_date" date,
	"status" "status" DEFAULT 'Pending' NOT NULL,
	"utr" varchar(100),
	"docket_no" varchar(100),
	"courier_address" text,
	"generated_pdf" varchar(500),
	"cancel_pdf" varchar(500),
	"remarks" text,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "emds" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"type" varchar(50) DEFAULT 'TMS' NOT NULL,
	"tender_id" bigint NOT NULL,
	"tender_no" varchar(100) DEFAULT 'NA' NOT NULL,
	"due_date" timestamp with time zone,
	"purpose_type" "purpose_type" DEFAULT 'EMD' NOT NULL,
	"instrument_type" smallint NOT NULL,
	"project_name" varchar(255) NOT NULL,
	"amount" numeric(16, 2) NOT NULL,
	"requested_by" varchar(200) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	"deleted_at" timestamp with time zone
);
