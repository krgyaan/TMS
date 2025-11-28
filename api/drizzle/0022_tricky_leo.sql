CREATE TABLE "rfq_documents" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"rfq_id" bigint NOT NULL,
	"doc_type" varchar(50) NOT NULL,
	"path" text NOT NULL,
	"metadata" jsonb DEFAULT '{}',
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "rfq_items" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"rfq_id" bigint NOT NULL,
	"line_number" integer,
	"requirement" text NOT NULL,
	"unit" varchar(64),
	"qty" numeric,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "rfq_response_documents" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"doc_type" varchar(50) NOT NULL,
	"path" varchar(255) NOT NULL,
	"metadata" jsonb DEFAULT '{}',
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "rfq_response_items" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"rfq_item_id" bigint,
	"description" varchar(255),
	"unit" varchar(64),
	"qty" numeric,
	"unit_price" numeric(15, 2),
	"total_price" numeric(15, 2),
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "rfq_responses" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"vendor_id" bigint NOT NULL,
	"receipt_datetime" timestamp with time zone NOT NULL,
	"gst_percentage" numeric(5, 2),
	"gst_type" varchar(50),
	"delivery_time" integer,
	"freight_type" varchar(50),
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "rfqs" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"tender_id" bigint NOT NULL,
	"due_date" timestamp with time zone,
	"notes" text,
	"requested_organization" varchar(255),
	"requested_vendor" varchar(255),
	"created_by" bigint,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	"deleted_at" timestamp with time zone
);
