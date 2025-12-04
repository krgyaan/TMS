ALTER TABLE "payment_instruments" ADD COLUMN "status" varchar(100) DEFAULT 'Pending';--> statement-breakpoint
ALTER TABLE "payment_instruments" DROP COLUMN "instrument_status";--> statement-breakpoint
DROP TYPE "public"."instrument_status";