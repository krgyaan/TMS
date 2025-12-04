ALTER TABLE "tender_costing_sheets" ALTER COLUMN "status" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "tender_costing_sheets" ALTER COLUMN "status" SET DEFAULT 'Pending'::text;--> statement-breakpoint
DROP TYPE "public"."costing_sheet_status";--> statement-breakpoint
CREATE TYPE "public"."costing_sheet_status" AS ENUM('Pending', 'Submitted', 'Approved', 'Rejected/Redo');--> statement-breakpoint
ALTER TABLE "tender_costing_sheets" ALTER COLUMN "status" SET DEFAULT 'Pending'::"public"."costing_sheet_status";--> statement-breakpoint
ALTER TABLE "tender_costing_sheets" ALTER COLUMN "status" SET DATA TYPE "public"."costing_sheet_status" USING "status"::"public"."costing_sheet_status";