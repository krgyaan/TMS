ALTER TABLE "tender_infos" ALTER COLUMN "tl_remarks" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "tender_infos" ALTER COLUMN "tender_fee_mode" SET DATA TYPE varchar(100);--> statement-breakpoint
ALTER TABLE "tender_infos" ALTER COLUMN "emd_mode" SET DATA TYPE varchar(100);--> statement-breakpoint
ALTER TABLE "tender_infos" ALTER COLUMN "approve_pqr_selection" SET DATA TYPE varchar(50);--> statement-breakpoint
ALTER TABLE "tender_infos" ALTER COLUMN "approve_finance_doc_selection" SET DATA TYPE varchar(50);--> statement-breakpoint
ALTER TABLE "tender_infos" ALTER COLUMN "tl_rejection_remarks" SET DATA TYPE text;