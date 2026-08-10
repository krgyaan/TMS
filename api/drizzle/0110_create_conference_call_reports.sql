CREATE TABLE IF NOT EXISTS "service_conference_call_reports" (
    "id" bigserial PRIMARY KEY NOT NULL,
    "complaint_id" bigint NOT NULL,
    "issue_description" text NOT NULL,
    "materials_required" text,
    "actions_planned" text,
    "voice_recording_path" varchar(255),
    "attachments" jsonb,
    "created_by" bigint,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "fk_ccr_complaint_id" ON "service_conference_call_reports" USING btree ("complaint_id");