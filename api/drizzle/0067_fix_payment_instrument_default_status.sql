-- Fix payment_instruments default status from ACCOUNTS_FORM_PENDING to PENDING
ALTER TABLE "payment_instruments" ALTER COLUMN "status" SET DEFAULT 'PENDING';--> statement-breakpoint
UPDATE "payment_instruments" SET "status" = 'PENDING' WHERE "status" = 'ACCOUNTS_FORM_PENDING';
