CREATE TABLE "projects" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"team_name" varchar(255) NOT NULL,
	"tender_id" integer,
	"organisation_id" bigint NOT NULL,
	"item_id" bigint NOT NULL,
	"location_id" bigint NOT NULL,
	"po_no" varchar(255),
	"project_code" varchar(255),
	"project_name" varchar(255),
	"po_upload" varchar(255),
	"po_date" date,
	"sap_po_date" date,
	"sap_po_no" varchar(255),
	"status" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "lead_types" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"name" varchar(255),
	"status" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "vendor_accs" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"org" bigint NOT NULL,
	"account_name" varchar(255) NOT NULL,
	"account_num" varchar(255) NOT NULL,
	"account_ifsc" varchar(255) NOT NULL,
	"status" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "vendor_files" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"vendor_id" bigint NOT NULL,
	"name" varchar(255) NOT NULL,
	"file_path" varchar(255) NOT NULL,
	"status" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "vendor_gsts" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"org" bigint NOT NULL,
	"gst_state" varchar(255) NOT NULL,
	"gst_num" varchar(255) NOT NULL,
	"status" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "states" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"name" varchar(255),
	"status" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "websites" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"url" varchar(255),
	"status" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_organisation_id_organizations_id_fk" FOREIGN KEY ("organisation_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_item_id_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."items"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_location_id_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vendor_accs" ADD CONSTRAINT "vendor_accs_org_vendor_organizations_id_fk" FOREIGN KEY ("org") REFERENCES "public"."vendor_organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vendor_files" ADD CONSTRAINT "vendor_files_vendor_id_vendors_id_fk" FOREIGN KEY ("vendor_id") REFERENCES "public"."vendors"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vendor_gsts" ADD CONSTRAINT "vendor_gsts_org_vendor_organizations_id_fk" FOREIGN KEY ("org") REFERENCES "public"."vendor_organizations"("id") ON DELETE no action ON UPDATE no action;