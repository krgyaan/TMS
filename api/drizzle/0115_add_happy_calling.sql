CREATE TABLE "happy_calling" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"c_d_id" bigint,
	"organization" varchar(255),
	"name" varchar(255) NOT NULL,
	"designation" varchar(255),
	"email" varchar(255),
	"phone" varchar(200),
	"date" timestamp with time zone,
	"status" varchar(50),
	"next_followup_date" timestamp with time zone,
	"broadcast" integer DEFAULT 0 NOT NULL,
	"details" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
CREATE INDEX "idx_happy_calling_name" ON "happy_calling" USING btree ("name");--> statement-breakpoint
CREATE INDEX "idx_happy_calling_org" ON "happy_calling" USING btree ("organization");
