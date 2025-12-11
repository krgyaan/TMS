CREATE TYPE "public"."assignment_status" AS ENUM('assigned', 'initiated');--> statement-breakpoint
CREATE TYPE "public"."frequency_type" AS ENUM('daily', 'alternate', 'weekly', 'biweekly', 'monthly', 'stopped');--> statement-breakpoint
CREATE TYPE "public"."stop_reason_type" AS ENUM('party_angry', 'objective_achieved', 'not_reachable', 'other');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('admin', 'manager', 'user');--> statement-breakpoint
CREATE TYPE "public"."user_team" AS ENUM('AC', 'DC');--> statement-breakpoint
CREATE TABLE "client_directory" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"email" varchar(255),
	"phone" varchar(20),
	"organization" varchar(255),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "unique_client_email" UNIQUE("email"),
	CONSTRAINT "unique_client_phone" UNIQUE("phone")
);
--> statement-breakpoint
CREATE TABLE "couriers" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"to_org" varchar(255) NOT NULL,
	"to_name" varchar(255) NOT NULL,
	"to_addr" text NOT NULL,
	"to_pin" varchar(10) NOT NULL,
	"to_mobile" varchar(15) NOT NULL,
	"emp_from" integer NOT NULL,
	"del_date" timestamp NOT NULL,
	"urgency" integer NOT NULL,
	"courier_provider" varchar(100),
	"pickup_date" timestamp,
	"docket_no" varchar(100),
	"delivery_date" timestamp,
	"delivery_pod" varchar(255),
	"within_time" boolean,
	"courier_docs" jsonb DEFAULT '[]'::jsonb,
	"status" integer DEFAULT 0,
	"tracking_number" varchar(100),
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "follow_ups" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"emd_id" bigint,
	"area" varchar(255) NOT NULL,
	"party_name" varchar(255) NOT NULL,
	"amount" numeric(15, 2) DEFAULT '0.00' NOT NULL,
	"category_id" bigint,
	"assigned_to_id" bigint NOT NULL,
	"created_by_id" bigint NOT NULL,
	"assignment_status" "assignment_status" DEFAULT 'assigned' NOT NULL,
	"comment" text,
	"details" text,
	"latest_comment" text,
	"contacts" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"frequency" "frequency_type" DEFAULT 'daily' NOT NULL,
	"start_from" date NOT NULL,
	"next_follow_up_date" date,
	"follow_up_history" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"reminder_count" smallint DEFAULT 1 NOT NULL,
	"stop_reason" "stop_reason_type",
	"proof_text" text,
	"proof_image_path" varchar(500),
	"stop_remarks" text,
	"attachments" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "follow_ups" ADD CONSTRAINT "follow_ups_category_id_followup_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."followup_categories"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "follow_ups" ADD CONSTRAINT "follow_ups_assigned_to_id_users_id_fk" FOREIGN KEY ("assigned_to_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "follow_ups" ADD CONSTRAINT "follow_ups_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_client_directory_name" ON "client_directory" USING btree ("name");--> statement-breakpoint
CREATE INDEX "idx_client_directory_org" ON "client_directory" USING btree ("organization");--> statement-breakpoint
CREATE INDEX "idx_client_directory_email" ON "client_directory" USING btree ("email");--> statement-breakpoint
CREATE INDEX "idx_client_directory_phone" ON "client_directory" USING btree ("phone");--> statement-breakpoint
CREATE INDEX "idx_followups_start_from" ON "follow_ups" USING btree ("start_from" DESC NULLS LAST) WHERE "follow_ups"."deleted_at" IS NULL;--> statement-breakpoint
CREATE INDEX "idx_followups_frequency" ON "follow_ups" USING btree ("frequency") WHERE "follow_ups"."deleted_at" IS NULL;--> statement-breakpoint
CREATE INDEX "idx_followups_stop_reason" ON "follow_ups" USING btree ("stop_reason") WHERE "follow_ups"."deleted_at" IS NULL AND "follow_ups"."frequency" = 'stopped';--> statement-breakpoint
CREATE INDEX "idx_followups_assigned_to" ON "follow_ups" USING btree ("assigned_to_id") WHERE "follow_ups"."deleted_at" IS NULL;--> statement-breakpoint
CREATE INDEX "idx_followups_future" ON "follow_ups" USING btree ("start_from") WHERE "follow_ups"."deleted_at" IS NULL;--> statement-breakpoint
CREATE INDEX "idx_followups_amount_calc" ON "follow_ups" USING btree ("assigned_to_id","stop_reason") WHERE "follow_ups"."deleted_at" IS NULL;--> statement-breakpoint
CREATE INDEX "idx_followups_emd" ON "follow_ups" USING btree ("emd_id") WHERE "follow_ups"."emd_id" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "idx_followups_category" ON "follow_ups" USING btree ("category_id");--> statement-breakpoint
CREATE INDEX "idx_followups_created_by" ON "follow_ups" USING btree ("created_by_id") WHERE "follow_ups"."deleted_at" IS NULL;