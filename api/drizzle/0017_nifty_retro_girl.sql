CREATE TYPE "public"."incomplete_field_status" AS ENUM('pending', 'resolved');--> statement-breakpoint
CREATE TABLE "tender_incomplete_fields" (
	"id" serial PRIMARY KEY NOT NULL,
	"tender_id" bigint NOT NULL,
	"field_name" varchar(100) NOT NULL,
	"comment" text NOT NULL,
	"status" "incomplete_field_status" DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "tender_incomplete_fields_tender_id_idx" ON "tender_incomplete_fields" USING btree ("tender_id");