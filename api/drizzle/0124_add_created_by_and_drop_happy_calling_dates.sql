ALTER TABLE "public"."client_directory" ADD COLUMN "created_by" bigint;--> statement-breakpoint
ALTER TABLE "public"."happy_calling" ADD COLUMN "created_by" bigint;--> statement-breakpoint
ALTER TABLE "public"."happy_calling" DROP COLUMN "date";--> statement-breakpoint
ALTER TABLE "public"."happy_calling" DROP COLUMN "next_followup_date";
