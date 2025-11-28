ALTER TABLE "payment_instruments" ALTER COLUMN "utr" SET DATA TYPE varchar(255);--> statement-breakpoint
ALTER TABLE "payment_instruments" ALTER COLUMN "docket_no" SET DATA TYPE varchar(255);--> statement-breakpoint
ALTER TABLE "payment_instruments" ADD CONSTRAINT "payment_instruments_docket_no_unique" UNIQUE("docket_no");
