CREATE TYPE "public"."amc_bill_type" AS ENUM('constant', 'variable');--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "amc" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"team_name" varchar(255) NOT NULL,
	"project_id" bigint NOT NULL,
	"created_by" bigint,
	"service_frequency" varchar(255) NOT NULL,
	"amc_start_date" date NOT NULL,
	"next_service_due" date DEFAULT '2025-06-30' NOT NULL,
	"amc_end_date" date NOT NULL,
	"bill_frequency" varchar(255) NOT NULL,
	"bill_type" "amc_bill_type" DEFAULT 'constant' NOT NULL,
	"bill_value" numeric(10, 2),
	"variable_bills" jsonb,
	"amc_po_path" varchar(255),
	"service_report_path" varchar(255),
	"signed_service_report_path" varchar(255),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "amcs_project_id_foreign" ON "amc" USING btree ("project_id");--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "amc_sites" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"amc_id" bigint NOT NULL,
	"name" varchar(255) NOT NULL,
	"address" text NOT NULL,
	"map_link" varchar(255),
	"status" varchar(50) DEFAULT 'Pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "amc_sites_amc_id_foreign" ON "amc_sites" USING btree ("amc_id");--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "amc_site_contacts" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"amc_site_id" bigint NOT NULL,
	"name" varchar(255) NOT NULL,
	"organization" varchar(255),
	"mobile" varchar(255) NOT NULL,
	"email" varchar(255),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "amc_site_contacts_amc_site_id_foreign" ON "amc_site_contacts" USING btree ("amc_site_id");--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "amc_products" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"amc_id" bigint NOT NULL,
	"item_id" bigint NOT NULL,
	"description" text,
	"make" varchar(255),
	"model" varchar(255),
	"serial_no" varchar(255),
	"quantity" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "amc_products_amc_id_foreign" ON "amc_products" USING btree ("amc_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "amc_products_item_id_foreign" ON "amc_products" USING btree ("item_id");--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "amc_service_engineers" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"amc_id" bigint NOT NULL,
	"name" varchar(255) NOT NULL,
	"organization" varchar(255),
	"mobile" varchar(255) NOT NULL,
	"email" varchar(255),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "amc_service_engineers_amc_id_foreign" ON "amc_service_engineers" USING btree ("amc_id");--> statement-breakpoint
