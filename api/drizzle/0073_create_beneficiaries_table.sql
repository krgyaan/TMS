CREATE TABLE "project_beneficiaries" (
    "id" bigserial PRIMARY KEY NOT NULL,
    "name" varchar(255),
    "account_number" varchar(100),
    "ifsc" varchar(50),
    "bank_name" varchar(255),
    "created_at" timestamp with time zone DEFAULT now() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
ALTER TABLE "project_payment_requests" ADD COLUMN "bank_name" varchar(255);--> statement-breakpoint
ALTER TABLE "project_payment_requests" DROP COLUMN "account_name";--> statement-breakpoint

