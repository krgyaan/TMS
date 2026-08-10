CREATE TABLE IF NOT EXISTS "amc_services" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"amc_id" bigint NOT NULL,
	"amc_site_id" bigint NOT NULL,
	"bill_id" bigint,
	"service_no" integer NOT NULL,
	"service_due_date" date NOT NULL,
	"status" varchar(50) DEFAULT 'Pending' NOT NULL,
	"service_completed_date" timestamp with time zone,
	"filled_report" varchar(255),
	"signed_report" varchar(255),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "amc_bill" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"amc_id" bigint NOT NULL,
	"amc_site_id" bigint NOT NULL,
	"bill_no" integer NOT NULL,
	"bill_due_date" date NOT NULL,
	"status" varchar(50) DEFAULT 'Pending' NOT NULL,
	"invoice" varchar(255),
	"payment_receipt" varchar(255),
	"amount" numeric(10, 2),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "amc_services_amc_id_foreign" ON "amc_services" USING btree ("amc_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "amc_services_amc_site_id_foreign" ON "amc_services" USING btree ("amc_site_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "amc_services_bill_id_foreign" ON "amc_services" USING btree ("bill_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "amc_bill_amc_id_foreign" ON "amc_bill" USING btree ("amc_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "amc_bill_amc_site_id_foreign" ON "amc_bill" USING btree ("amc_site_id");--> statement-breakpoint
