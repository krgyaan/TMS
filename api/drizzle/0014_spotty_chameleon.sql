ALTER TABLE "tender_infos" DROP CONSTRAINT "tender_infos_oem_not_allowed_organizations_id_fk";
--> statement-breakpoint
ALTER TABLE "tender_infos" ALTER COLUMN "oem_not_allowed" SET DATA TYPE varchar(50);--> statement-breakpoint
ALTER TABLE "tender_infos" ADD COLUMN "tl_rejection_remarks" varchar(200);--> statement-breakpoint
