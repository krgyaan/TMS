ALTER TABLE "physical_docs" ALTER COLUMN "tender_id" TYPE integer USING "tender_id"::text::integer;--> statement-breakpoint
ALTER TABLE "physical_docs" ALTER COLUMN "courier_no" SET NOT NULL;
