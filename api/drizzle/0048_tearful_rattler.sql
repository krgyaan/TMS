CREATE TABLE "employee_imprests" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"party_name" varchar(255),
	"project_name" varchar(255),
	"amount" integer NOT NULL,
	"category" varchar(255),
	"team_id" integer,
	"remark" text,
	"invoice_proof" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"approval_status" integer DEFAULT 0 NOT NULL,
	"tally_status" integer DEFAULT 0 NOT NULL,
	"proof_status" integer DEFAULT 0 NOT NULL,
	"status" integer DEFAULT 1 NOT NULL,
	"approved_date" timestamp with time zone,
	"ip" varchar(100),
	"strtotime" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "tender_document_checklists" RENAME COLUMN "document_path" TO "extra_documents";--> statement-breakpoint
ALTER TABLE "tender_document_checklists" ALTER COLUMN "tender_id" SET DATA TYPE integer;--> statement-breakpoint
ALTER TABLE "tender_document_checklists" ADD COLUMN "selected_documents" jsonb;--> statement-breakpoint
ALTER TABLE "tender_document_checklists" DROP COLUMN "document_name";--> statement-breakpoint
ALTER TABLE "tender_document_checklists" ADD CONSTRAINT "tender_document_checklists_tender_id_unique" UNIQUE("tender_id");