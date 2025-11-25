CREATE TYPE "public"."deleteStatus" AS ENUM('0', '1');--> statement-breakpoint
CREATE TYPE "public"."tlStatus" AS ENUM('0', '1', '2', '3');--> statement-breakpoint
CREATE TYPE "public"."incomplete_field_status" AS ENUM('pending', 'resolved');--> statement-breakpoint
CREATE TABLE "users" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"username" varchar(100),
	"email" varchar(255) NOT NULL,
	"mobile" varchar(20),
	"password" varchar(255) NOT NULL,
	"email_verified_at" timestamp with time zone,
	"last_login_at" timestamp with time zone,
	"is_active" boolean DEFAULT true NOT NULL,
	"remember_token" varchar(255),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "users_username_unique" UNIQUE("username"),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "user_profiles" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"user_id" bigint NOT NULL,
	"first_name" varchar(255),
	"last_name" varchar(255),
	"date_of_birth" date,
	"gender" varchar(20),
	"employee_code" varchar(50),
	"designation_id" bigint,
	"primary_team_id" bigint,
	"alt_email" varchar(255),
	"emergency_contact_name" varchar(255),
	"emergency_contact_phone" varchar(20),
	"image" varchar(255),
	"signature" varchar(255),
	"date_of_joining" date,
	"date_of_exit" date,
	"timezone" varchar(50) DEFAULT 'Asia/Kolkata' NOT NULL,
	"locale" varchar(10) DEFAULT 'en' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_profiles_employee_code_unique" UNIQUE("employee_code")
);
--> statement-breakpoint
CREATE TABLE "oauth_accounts" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"user_id" bigint NOT NULL,
	"provider" varchar(50) NOT NULL,
	"provider_user_id" varchar(255) NOT NULL,
	"provider_email" varchar(255),
	"avatar" varchar(255),
	"access_token" text NOT NULL,
	"refresh_token" text,
	"expires_at" timestamp with time zone,
	"scopes" text,
	"raw_payload" json,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "roles" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"guard_name" varchar(50) DEFAULT 'web' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "designations" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"name" varchar(100) NOT NULL,
	"description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "designations_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "teams" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"name" varchar(100) NOT NULL,
	"parent_id" bigint,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "employee_imprests" (
	"id" serial PRIMARY KEY NOT NULL,
	"name_id" integer NOT NULL,
	"party_name" varchar(255),
	"project_name" varchar(255),
	"amount" integer NOT NULL,
	"category" varchar(255),
	"team_id" integer,
	"remark" text,
	"invoice_proof" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"approval_status" integer DEFAULT 0 NOT NULL,
	"tally_status" integer DEFAULT 0 NOT NULL,
	"proof_status" integer DEFAULT 0 NOT NULL,
	"status" integer DEFAULT 1 NOT NULL,
	"approved_date" timestamp with time zone,
	"ip" varchar(100),
	"strtotime" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "imprest_categories" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"name" varchar(100) NOT NULL,
	"heading" varchar(100),
	"status" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "imprest_categories_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "followup_categories" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"name" varchar(100) NOT NULL,
	"status" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "followup_categories_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "documents_submitted" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"name" varchar(100) NOT NULL,
	"status" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "documents_submitted_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "item_headings" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"name" varchar(100) NOT NULL,
	"team_id" bigint,
	"status" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "item_headings_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "items" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"name" varchar(100) NOT NULL,
	"team_id" bigint,
	"heading_id" bigint,
	"status" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "items_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "locations" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"name" varchar(100) NOT NULL,
	"state" varchar(100),
	"region" varchar(100),
	"acronym" varchar(20),
	"status" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "locations_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "organizations" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"acronym" varchar(50),
	"industry_id" bigint,
	"status" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "organizations_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "industries" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"name" varchar(100) NOT NULL,
	"description" text,
	"status" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "industries_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "statuses" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"name" varchar(100) NOT NULL,
	"tender_category" varchar(100),
	"status" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "statuses_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "tq_types" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"name" varchar(100) NOT NULL,
	"status" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "tq_types_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "vendor_organizations" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"address" text,
	"status" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "vendor_organizations_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "vendors" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"organization_id" bigint,
	"name" varchar(255) NOT NULL,
	"email" varchar(255),
	"address" text,
	"status" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "loan_parties" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"name" varchar(100) NOT NULL,
	"description" text,
	"status" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "loan_parties_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "companies" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"entity_type" varchar(100) NOT NULL,
	"registered_address" text NOT NULL,
	"branch_addresses" jsonb NOT NULL,
	"about" text,
	"website" varchar(255),
	"phone" varchar(50),
	"email" varchar(255),
	"fax" varchar(50),
	"signatory_name" varchar(255),
	"designation" varchar(255),
	"tender_keywords" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "companies_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "company_documents" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"company_id" bigint NOT NULL,
	"name" varchar(255) NOT NULL,
	"size" bigint DEFAULT 0,
	"is_folder" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
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
CREATE TABLE "tender_infos" (
	"id" serial PRIMARY KEY NOT NULL,
	"team" bigint NOT NULL,
	"tender_no" varchar(255) NOT NULL,
	"organization" bigint,
	"tender_name" varchar(255) NOT NULL,
	"item" bigint NOT NULL,
	"gst_values" numeric(15, 2) DEFAULT '0' NOT NULL,
	"tender_fees" numeric(15, 2) DEFAULT '0' NOT NULL,
	"emd" numeric(15, 2) DEFAULT '0' NOT NULL,
	"team_member" bigint NOT NULL,
	"due_date" timestamp with time zone NOT NULL,
	"remarks" varchar(200),
	"status" bigint DEFAULT 1 NOT NULL,
	"location" bigint,
	"website" bigint,
	"courier_address" text,
	"delete_status" "deleteStatus" DEFAULT '0' NOT NULL,
	"tl_remarks" varchar(200),
	"rfq_to" varchar(15),
	"tl_status" "tlStatus" DEFAULT '0' NOT NULL,
	"tender_fee_mode" varchar(100),
	"emd_mode" varchar(100),
	"approve_pqr_selection" varchar(50),
	"approve_finance_doc_selection" varchar(50),
	"tender_approval_status" varchar(50),
	"tl_rejection_remarks" text,
	"oem_not_allowed" varchar(50),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tender_clients" (
	"id" serial PRIMARY KEY NOT NULL,
	"tender_id" bigint NOT NULL,
	"client_name" varchar(255),
	"client_designation" varchar(255),
	"client_mobile" varchar(50),
	"client_email" varchar(255),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tender_financial_documents" (
	"id" serial PRIMARY KEY NOT NULL,
	"tender_id" bigint NOT NULL,
	"document_name" varchar(255) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tender_information" (
	"id" serial PRIMARY KEY NOT NULL,
	"tender_id" bigint NOT NULL,
	"te_recommendation" varchar(5) NOT NULL,
	"te_rejection_reason" integer,
	"te_rejection_remarks" text,
	"processing_fee_amount" numeric(12, 2),
	"processing_fee_mode" text[],
	"tender_fee_amount" numeric(12, 2),
	"tender_fee_mode" text[],
	"emd_required" varchar(10),
	"emd_mode" text[],
	"reverse_auction_applicable" varchar(5),
	"payment_terms_supply" integer,
	"payment_terms_installation" integer,
	"bid_validity_days" integer,
	"commercial_evaluation" varchar(50),
	"maf_required" varchar(30),
	"delivery_time_supply" integer,
	"delivery_time_installation_inclusive" boolean,
	"delivery_time_installation_days" integer,
	"pbg_in_form_of" varchar(20),
	"pbg_percentage" numeric(5, 2),
	"pbg_duration_months" integer,
	"sd_in_form_of" varchar(20),
	"security_deposit_percentage" numeric(5, 2),
	"sd_duration_months" integer,
	"ld_percentage_per_week" numeric(5, 2),
	"max_ld_percentage" numeric(5, 2),
	"physical_docs_required" varchar(5),
	"physical_docs_deadline" timestamp,
	"technical_eligibility_age_years" integer,
	"order_value_1" numeric(12, 2),
	"order_value_2" numeric(12, 2),
	"order_value_3" numeric(12, 2),
	"avg_annual_turnover_type" varchar(20),
	"avg_annual_turnover_value" numeric(12, 2),
	"working_capital_type" varchar(20),
	"working_capital_value" numeric(12, 2),
	"solvency_certificate_type" varchar(20),
	"solvency_certificate_value" numeric(12, 2),
	"net_worth_type" varchar(20),
	"net_worth_value" numeric(12, 2),
	"client_organisation" varchar(255),
	"courier_address" text,
	"te_final_remark" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "tender_information_tender_id_unique" UNIQUE("tender_id")
);
--> statement-breakpoint
CREATE TABLE "tender_technical_documents" (
	"id" serial PRIMARY KEY NOT NULL,
	"tender_id" bigint NOT NULL,
	"document_name" varchar(255) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
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
ALTER TABLE "user_profiles" ADD CONSTRAINT "user_profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_profiles" ADD CONSTRAINT "user_profiles_designation_id_designations_id_fk" FOREIGN KEY ("designation_id") REFERENCES "public"."designations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_profiles" ADD CONSTRAINT "user_profiles_primary_team_id_teams_id_fk" FOREIGN KEY ("primary_team_id") REFERENCES "public"."teams"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "oauth_accounts" ADD CONSTRAINT "oauth_accounts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "teams" ADD CONSTRAINT "teams_parent_id_teams_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."teams"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "item_headings" ADD CONSTRAINT "item_headings_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "items" ADD CONSTRAINT "items_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "items" ADD CONSTRAINT "items_heading_id_item_headings_id_fk" FOREIGN KEY ("heading_id") REFERENCES "public"."item_headings"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organizations" ADD CONSTRAINT "organizations_industry_id_industries_id_fk" FOREIGN KEY ("industry_id") REFERENCES "public"."industries"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vendors" ADD CONSTRAINT "vendors_organization_id_vendor_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."vendor_organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_documents" ADD CONSTRAINT "company_documents_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_organisation_id_organizations_id_fk" FOREIGN KEY ("organisation_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_item_id_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."items"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_location_id_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vendor_accs" ADD CONSTRAINT "vendor_accs_org_vendor_organizations_id_fk" FOREIGN KEY ("org") REFERENCES "public"."vendor_organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vendor_files" ADD CONSTRAINT "vendor_files_vendor_id_vendors_id_fk" FOREIGN KEY ("vendor_id") REFERENCES "public"."vendors"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vendor_gsts" ADD CONSTRAINT "vendor_gsts_org_vendor_organizations_id_fk" FOREIGN KEY ("org") REFERENCES "public"."vendor_organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tender_infos" ADD CONSTRAINT "tender_infos_team_teams_id_fk" FOREIGN KEY ("team") REFERENCES "public"."teams"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tender_infos" ADD CONSTRAINT "tender_infos_organization_organizations_id_fk" FOREIGN KEY ("organization") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tender_infos" ADD CONSTRAINT "tender_infos_item_items_id_fk" FOREIGN KEY ("item") REFERENCES "public"."items"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tender_infos" ADD CONSTRAINT "tender_infos_team_member_users_id_fk" FOREIGN KEY ("team_member") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tender_infos" ADD CONSTRAINT "tender_infos_status_statuses_id_fk" FOREIGN KEY ("status") REFERENCES "public"."statuses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tender_infos" ADD CONSTRAINT "tender_infos_location_locations_id_fk" FOREIGN KEY ("location") REFERENCES "public"."locations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tender_infos" ADD CONSTRAINT "tender_infos_website_websites_id_fk" FOREIGN KEY ("website") REFERENCES "public"."websites"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "users_mobile_idx" ON "users" USING btree ("mobile");--> statement-breakpoint
CREATE UNIQUE INDEX "roles_name_guard_index" ON "roles" USING btree ("name","guard_name");--> statement-breakpoint
CREATE INDEX "tender_clients_tender_id_idx" ON "tender_clients" USING btree ("tender_id");--> statement-breakpoint
CREATE INDEX "tender_fin_docs_tender_id_idx" ON "tender_financial_documents" USING btree ("tender_id");--> statement-breakpoint
CREATE INDEX "tender_info_tender_id_idx" ON "tender_information" USING btree ("tender_id");--> statement-breakpoint
CREATE INDEX "tender_tech_docs_tender_id_idx" ON "tender_technical_documents" USING btree ("tender_id");--> statement-breakpoint
CREATE INDEX "tender_incomplete_fields_tender_id_idx" ON "tender_incomplete_fields" USING btree ("tender_id");