CREATE TABLE "insurance_policies" (
	"id" serial PRIMARY KEY NOT NULL,
	"imprest_id" integer,
	"maker_request_id" integer,
	"insurance_type" varchar(30) NOT NULL,
	"policy_number" varchar(255),
	"insurer_name" varchar(255),
	"start_date" date NOT NULL,
	"end_date" date NOT NULL,
	"policy_document" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"sum_assured" numeric(15, 2) NOT NULL,
	"no_of_manpower" integer,
	"manpower_names" text,
	"location" varchar(255),
	"items_covered" text,
	"lr_copy" jsonb,
	"created_by" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "employee_imprests" ADD COLUMN "insurance_policy_id" integer;--> statement-breakpoint
ALTER TABLE "insurance_policies" ADD CONSTRAINT "insurance_policies_imprest_id_employee_imprests_id_fk" FOREIGN KEY ("imprest_id") REFERENCES "public"."employee_imprests"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "insurance_policies_imprest_id_idx" ON "insurance_policies" USING btree ("imprest_id");--> statement-breakpoint
CREATE UNIQUE INDEX "insurance_policies_maker_request_id_idx" ON "insurance_policies" USING btree ("maker_request_id");
