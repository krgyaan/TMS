CREATE TABLE IF NOT EXISTS "amc_completed_services" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"amc_id" bigint NOT NULL,
	"amc_site_id" bigint,
	"service_due_date" date,
	"service_completed_date" timestamp with time zone,
	"notes" text,
	"status" varchar(50) DEFAULT 'Signed Service reports Received' NOT NULL,
	"invoice" varchar(255),
	"payment_receipt" varchar(255),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "amc_completed_services_amc_id_foreign" ON "amc_completed_services" USING btree ("amc_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "amc_completed_services_amc_site_id_foreign" ON "amc_completed_services" USING btree ("amc_site_id");--> statement-breakpoint
