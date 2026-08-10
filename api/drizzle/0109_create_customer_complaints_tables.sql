CREATE TABLE IF NOT EXISTS "customer_complaints" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"organization" varchar(255),
	"designation" varchar(255),
	"phone" varchar(20) NOT NULL,
	"email" varchar(255) NOT NULL,
	"site_project_name" varchar(255) NOT NULL,
	"po_no" varchar(100),
	"site_location" varchar(255) NOT NULL,
	"attachment" varchar(255),
	"issue_faced" text,
	"status" varchar(50) DEFAULT 'Pending',
	"ticket_no" varchar(50),
	"created_by" bigint,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "customer_complaints_created_by_foreign" ON "customer_complaints" USING btree ("created_by");--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "service_engineers" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"complaint_id" bigint NOT NULL,
	"name" varchar(255) NOT NULL,
	"phone" varchar(20) NOT NULL,
	"email" varchar(255) NOT NULL,
	"alloted_by" bigint,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "fk_customer_service_engineers_complaint" ON "service_engineers" USING btree ("complaint_id");--> statement-breakpoint
