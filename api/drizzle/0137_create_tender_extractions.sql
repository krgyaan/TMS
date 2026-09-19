-- 0136: Create tender_extractions table for durable storage of AI PDF extraction results
CREATE TABLE IF NOT EXISTS "tender_extractions" (
    "id" serial PRIMARY KEY NOT NULL,
    "tender_id" bigint NOT NULL UNIQUE,
    "fields" jsonb NOT NULL,
    "missing_fields" text[],
    "extraction_version" varchar(50) DEFAULT '1.0.0',
    "processing_time_ms" integer,
    "user_id" bigint,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "tender_extractions_tender_id_idx" ON "tender_extractions" ("tender_id");
