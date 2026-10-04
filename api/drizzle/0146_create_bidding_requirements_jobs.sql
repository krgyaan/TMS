CREATE TABLE IF NOT EXISTS "public"."bidding_requirements_jobs" (
    "id" serial PRIMARY KEY NOT NULL,
    "tender_id" integer NOT NULL,
    "document_hash" varchar(64) NOT NULL,
    "status" varchar(20) DEFAULT 'pending' NOT NULL,
    "result" jsonb,
    "error_code" varchar(50),
    "error_message" text,
    "user_id" bigint,
    "processing_time_ms" integer,
    "started_at" timestamp with time zone,
    "heartbeat_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS "bidding_requirements_jobs_tender_hash_uidx" ON "public"."bidding_requirements_jobs" ("tender_id", "document_hash");
CREATE INDEX IF NOT EXISTS "bidding_requirements_jobs_tender_id_idx" ON "public"."bidding_requirements_jobs" ("tender_id");
