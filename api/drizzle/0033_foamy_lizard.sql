ALTER TABLE "tender_information" RENAME COLUMN "pbg_in_form_of" TO "pbg_required";--> statement-breakpoint
ALTER TABLE "tender_information" RENAME COLUMN "sd_in_form_of" TO "sd_required";--> statement-breakpoint
ALTER TABLE "tender_information" ADD COLUMN "processing_fee_required" numeric(12, 2);--> statement-breakpoint
ALTER TABLE "tender_information" ADD COLUMN "tender_fee_required" varchar(5);--> statement-breakpoint
ALTER TABLE "tender_information" ADD COLUMN "emd_amount" numeric(12, 2);--> statement-breakpoint
ALTER TABLE "tender_information" ADD COLUMN "pbg_mode" varchar(20);--> statement-breakpoint
ALTER TABLE "tender_information" ADD COLUMN "sd_mode" varchar(20);--> statement-breakpoint
ALTER TABLE "tender_information" ADD COLUMN "ld_required" varchar(5);--> statement-breakpoint
ALTER TABLE "tender_information" ADD COLUMN "wo1_required" varchar(5);--> statement-breakpoint
ALTER TABLE "tender_information" ADD COLUMN "wo1_custom" text;--> statement-breakpoint
ALTER TABLE "tender_information" ADD COLUMN "wo2_required" varchar(5);--> statement-breakpoint
ALTER TABLE "tender_information" ADD COLUMN "wo2_custom" text;--> statement-breakpoint
ALTER TABLE "tender_information" ADD COLUMN "wo3_required" varchar(5);--> statement-breakpoint
ALTER TABLE "tender_information" ADD COLUMN "wo3_custom" text;