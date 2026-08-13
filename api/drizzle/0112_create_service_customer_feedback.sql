CREATE TABLE IF NOT EXISTS "service_customer_feedback" (
    "id" bigserial PRIMARY KEY NOT NULL,
    "complaint_id" bigint NOT NULL,
    "problem_resolved" varchar(1) NOT NULL,
    "satisfaction" integer,
    "suggestions" text,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "fk_feedback_complaint" ON "service_customer_feedback" USING btree ("complaint_id");--> statement-breakpoint
ALTER TABLE "service_customer_feedback" ADD CONSTRAINT "service_customer_feedback_chk_1" CHECK ("satisfaction" IS NULL OR ("satisfaction" >= 1 AND "satisfaction" <= 5));
