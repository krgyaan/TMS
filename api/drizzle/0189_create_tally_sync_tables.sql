-- Tally Phase 1: sync state per source and the durable job queue used by later phases.

CREATE TABLE IF NOT EXISTS "tally_sync_ledger" (
    "id" bigserial NOT NULL PRIMARY KEY,
    "company" varchar(255) NOT NULL,
    "entity_type" varchar(50) NOT NULL,
    "entity_id" varchar(100) NOT NULL,
    "source_fingerprint" varchar(64) NOT NULL,
    "amount_paise" bigint NOT NULL,
    "status" varchar(20) NOT NULL DEFAULT 'pending',
    "tally_voucher_number" varchar(255),
    "tally_voucher_guid" varchar(100),
    "attempts" integer NOT NULL DEFAULT 0,
    "last_error_code" varchar(50),
    "posted_at" timestamp with time zone,
    "created_at" timestamp with time zone NOT NULL DEFAULT now(),
    "updated_at" timestamp with time zone NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS "uq_tally_sync_ledger_entity" ON "tally_sync_ledger" ("company", "entity_type", "entity_id");
CREATE INDEX IF NOT EXISTS "idx_tally_sync_ledger_status" ON "tally_sync_ledger" ("status");

CREATE TABLE IF NOT EXISTS "tally_sync_jobs" (
    "id" bigserial NOT NULL PRIMARY KEY,
    "company" varchar(255) NOT NULL,
    "operation" varchar(50) NOT NULL,
    "entity_type" varchar(50) NOT NULL,
    "entity_id" varchar(100) NOT NULL,
    "payload" jsonb NOT NULL DEFAULT '{}'::jsonb,
    "status" varchar(20) NOT NULL DEFAULT 'queued',
    "priority" integer NOT NULL DEFAULT 0,
    "attempts" integer NOT NULL DEFAULT 0,
    "max_attempts" integer NOT NULL DEFAULT 3,
    "run_after" timestamp with time zone NOT NULL DEFAULT now(),
    "locked_at" timestamp with time zone,
    "locked_by" varchar(255),
    "depends_on_job_id" bigint REFERENCES "tally_sync_jobs"("id") ON DELETE SET NULL,
    "last_error_code" varchar(50),
    "last_error_message" text,
    "created_at" timestamp with time zone NOT NULL DEFAULT now(),
    "updated_at" timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_tally_sync_jobs_due" ON "tally_sync_jobs" ("status", "run_after");
CREATE INDEX IF NOT EXISTS "idx_tally_sync_jobs_company" ON "tally_sync_jobs" ("company", "status");
CREATE UNIQUE INDEX IF NOT EXISTS "uq_tally_sync_jobs_active" ON "tally_sync_jobs" ("company", "operation", "entity_type", "entity_id") WHERE "status" IN ('queued', 'running');
