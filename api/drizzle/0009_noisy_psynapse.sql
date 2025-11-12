ALTER TABLE "tender_infos" RENAME COLUMN "organisation" TO "organization";--> statement-breakpoint
ALTER TABLE "tender_infos" RENAME COLUMN "deleteStatus" TO "delete_status";--> statement-breakpoint
ALTER TABLE "tender_infos" RENAME COLUMN "tlStatus" TO "tl_status";--> statement-breakpoint
ALTER TABLE "tender_infos" RENAME COLUMN "tlRemarks" TO "tl_remarks";--> statement-breakpoint
ALTER TABLE "tender_infos" ALTER COLUMN "delete_status" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "tender_infos" ALTER COLUMN "delete_status" SET DEFAULT '0'::text;--> statement-breakpoint
DROP TYPE "public"."deleteStatus";--> statement-breakpoint
CREATE TYPE "public"."deleteStatus" AS ENUM('0', '1');--> statement-breakpoint
ALTER TABLE "tender_infos" ALTER COLUMN "delete_status" SET DEFAULT '0'::"public"."deleteStatus";--> statement-breakpoint
ALTER TABLE "tender_infos" ALTER COLUMN "delete_status" SET DATA TYPE "public"."deleteStatus" USING "delete_status"::"public"."deleteStatus";--> statement-breakpoint
ALTER TABLE "tender_infos" ALTER COLUMN "gst_values" SET DEFAULT '0';--> statement-breakpoint
ALTER TABLE "tender_infos" ALTER COLUMN "tender_fees" SET DEFAULT '0';--> statement-breakpoint
ALTER TABLE "tender_infos" ALTER COLUMN "emd" SET DEFAULT '0';--> statement-breakpoint
ALTER TABLE "tender_infos" ALTER COLUMN "due_date" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "tender_infos" ALTER COLUMN "status" SET DEFAULT 0;--> statement-breakpoint
ALTER TABLE "tender_infos" DROP COLUMN "due_time";