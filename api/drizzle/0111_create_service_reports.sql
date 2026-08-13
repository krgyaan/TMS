CREATE TABLE IF NOT EXISTS "service_reports" (
    "id" bigserial PRIMARY KEY NOT NULL,
    "complaint_id" bigint NOT NULL,
    "service_engineer_id" bigint,
    "remarks" text NOT NULL,
    "resolution_done" varchar(1),
    "unsigned_photo" jsonb,
    "signed_photo" jsonb,
    "resolved_photo" jsonb,
    "visit_date" timestamp with time zone,
    "uploaded_by" bigint,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "fk_service_reports_complaint" ON "service_reports" USING btree ("complaint_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "fk_service_reports_engineer" ON "service_reports" USING btree ("service_engineer_id");
