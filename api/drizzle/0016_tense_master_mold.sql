ALTER TABLE "tender_infos" DROP CONSTRAINT "tender_infos_tender_approval_status_statuses_id_fk";
--> statement-breakpoint
ALTER TABLE "tender_infos" ALTER COLUMN "tl_remarks" SET DATA TYPE varchar(200);--> statement-breakpoint
ALTER TABLE "tender_infos" ALTER COLUMN "tender_approval_status" SET DATA TYPE varchar(50);