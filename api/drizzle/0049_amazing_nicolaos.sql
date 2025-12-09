ALTER TABLE "tender_queries" ALTER COLUMN "tq_submission_deadline" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "tender_queries" ALTER COLUMN "status" SET DATA TYPE varchar(50);--> statement-breakpoint
ALTER TABLE "tender_queries" ALTER COLUMN "status" SET DEFAULT 'TQ awaited';--> statement-breakpoint
ALTER TABLE "tender_queries" ALTER COLUMN "status" SET NOT NULL;