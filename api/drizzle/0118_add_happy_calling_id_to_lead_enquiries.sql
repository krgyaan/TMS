ALTER TABLE "public"."lead_enquiries" ADD COLUMN "happy_calling_id" bigint;--> statement-breakpoint
ALTER TYPE "public"."contact_source" ADD VALUE 'enquiry';--> statement-breakpoint
ALTER TABLE "public"."lead_contacts" ADD COLUMN "enquiry_id" bigint;