CREATE TABLE "employee_imprest_transactions" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"txn_date" date NOT NULL,
	"team_member_name" varchar(255) NOT NULL,
	"amount" integer,
	"project_name" varchar(255) NOT NULL,
	"approval_status" integer DEFAULT 0 NOT NULL,
	"status" integer DEFAULT 1 NOT NULL,
	"ip" varchar(255),
	"strtotime" integer,
	"created_at" timestamp with time zone,
	"updated_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "employee_imprests" RENAME COLUMN "category" TO "category_id";--> statement-breakpoint
ALTER TABLE "employee_imprests" ALTER COLUMN "user_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "employee_imprests" ALTER COLUMN "amount" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "tender_costing_sheets" ADD COLUMN "google_sheet_id" varchar(255);--> statement-breakpoint
ALTER TABLE "tender_costing_sheets" ADD COLUMN "drive_folder_id" varchar(255);--> statement-breakpoint
ALTER TABLE "tender_costing_sheets" ADD COLUMN "sheet_created_by" varchar(255);--> statement-breakpoint
ALTER TABLE "tender_costing_sheets" ADD COLUMN "sheet_created_at" timestamp with time zone;