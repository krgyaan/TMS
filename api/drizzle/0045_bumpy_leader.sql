CREATE TYPE "public"."bid_submission_status" AS ENUM('Submission Pending', 'Bid Submitted', 'Tender Missed');--> statement-breakpoint
CREATE TYPE "public"."costing_sheet_status" AS ENUM('Pending', 'Submitted', 'Approved', 'Rejected', 'Redo');--> statement-breakpoint
CREATE TYPE "public"."tq_status" AS ENUM('Received', 'Replied', 'Missed');--> statement-breakpoint
CREATE TABLE "bid_submissions" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"tender_id" bigint NOT NULL,
	"status" "bid_submission_status" DEFAULT 'Submission Pending' NOT NULL,
	"submission_datetime" timestamp with time zone,
	"final_bidding_price" numeric(15, 2),
	"documents" jsonb,
	"submitted_by" bigint,
	"reason_for_missing" text,
	"prevention_measures" text,
	"tms_improvements" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tender_costing_sheets" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"tender_id" bigint NOT NULL,
	"submitted_by" bigint,
	"approved_by" bigint,
	"google_sheet_url" varchar(500),
	"sheet_title" varchar(255),
	"submitted_final_price" numeric(15, 2),
	"submitted_receipt_price" numeric(15, 2),
	"submitted_budget_price" numeric(15, 2),
	"submitted_gross_margin" numeric(8, 4),
	"te_remarks" text,
	"final_price" numeric(15, 2),
	"receipt_price" numeric(15, 2),
	"budget_price" numeric(15, 2),
	"gross_margin" numeric(8, 4),
	"oem_vendor_id" bigint,
	"status" "costing_sheet_status" DEFAULT 'Pending',
	"tl_remarks" text,
	"rejection_reason" text,
	"submitted_at" timestamp with time zone,
	"approved_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tender_document_checklists" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"tender_id" bigint NOT NULL,
	"document_name" varchar(255),
	"document_path" varchar(500),
	"submitted_by" bigint,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tender_queries" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"tender_id" bigint NOT NULL,
	"tq_submission_deadline" timestamp with time zone NOT NULL,
	"tq_document_received" varchar(500),
	"received_by" bigint,
	"received_at" timestamp with time zone,
	"status" "tq_status" DEFAULT 'Received',
	"replied_datetime" timestamp with time zone,
	"replied_document" varchar(500),
	"proof_of_submission" varchar(500),
	"replied_by" bigint,
	"replied_at" timestamp with time zone,
	"missed_reason" text,
	"prevention_measures" text,
	"tms_improvements" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tender_query_items" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"tender_query_id" bigint NOT NULL,
	"sr_no" integer NOT NULL,
	"tq_type_id" bigint,
	"query_description" text NOT NULL,
	"response" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "bid_submissions" ADD CONSTRAINT "bid_submissions_tender_id_tender_infos_id_fk" FOREIGN KEY ("tender_id") REFERENCES "public"."tender_infos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bid_submissions" ADD CONSTRAINT "bid_submissions_submitted_by_users_id_fk" FOREIGN KEY ("submitted_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tender_document_checklists" ADD CONSTRAINT "tender_document_checklists_tender_id_tender_infos_id_fk" FOREIGN KEY ("tender_id") REFERENCES "public"."tender_infos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tender_document_checklists" ADD CONSTRAINT "tender_document_checklists_submitted_by_users_id_fk" FOREIGN KEY ("submitted_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tender_queries" ADD CONSTRAINT "tender_queries_tender_id_tender_infos_id_fk" FOREIGN KEY ("tender_id") REFERENCES "public"."tender_infos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tender_queries" ADD CONSTRAINT "tender_queries_received_by_users_id_fk" FOREIGN KEY ("received_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tender_queries" ADD CONSTRAINT "tender_queries_replied_by_users_id_fk" FOREIGN KEY ("replied_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tender_query_items" ADD CONSTRAINT "tender_query_items_tender_query_id_tender_queries_id_fk" FOREIGN KEY ("tender_query_id") REFERENCES "public"."tender_queries"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tender_query_items" ADD CONSTRAINT "tender_query_items_tq_type_id_tq_types_id_fk" FOREIGN KEY ("tq_type_id") REFERENCES "public"."tq_types"("id") ON DELETE set null ON UPDATE no action;