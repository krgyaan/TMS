ALTER TABLE "public"."lead_followups" ADD COLUMN "happy_calling_id" bigint;--> statement-breakpoint
ALTER TABLE "public"."lead_followups" ADD COLUMN "source_type" varchar(50) DEFAULT 'lead' NOT NULL;--> statement-breakpoint
ALTER TABLE "public"."lead_followups" ALTER COLUMN "lead_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "public"."lead_contacts" ALTER COLUMN "lead_id" DROP NOT NULL;