ALTER TABLE "tender_information" RENAME COLUMN "pbg_duration_months" TO "pbg_duration";--> statement-breakpoint
ALTER TABLE "tender_information" RENAME COLUMN "security_deposit_percentage" TO "sd_percentage";--> statement-breakpoint
ALTER TABLE "tender_information" RENAME COLUMN "sd_duration_months" TO "sd_duration";--> statement-breakpoint
ALTER TABLE "tender_information" RENAME COLUMN "technical_eligibility_age_years" TO "technical_eligibility_age";--> statement-breakpoint
ALTER TABLE "tender_information" ALTER COLUMN "processing_fee_required" SET DATA TYPE varchar(5);--> statement-breakpoint
ALTER TABLE "tender_information" DROP COLUMN "client_organisation";