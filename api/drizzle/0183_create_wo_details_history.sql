-- Page-level action log for the 7-step WO Details wizard.
CREATE TABLE IF NOT EXISTS "wo_details_history" (
    "id" bigserial PRIMARY KEY NOT NULL,
    "wo_detail_id" bigint NOT NULL,
    "page_no" integer,
    "action" varchar(50) NOT NULL,
    "status_after" varchar(50),
    "remarks" text,
    "metadata" jsonb,
    "actor_id" bigint,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
         WHERE conname = 'wo_details_history_wo_detail_id_wo_details_id_fk'
           AND conrelid = 'wo_details_history'::regclass
    ) THEN
        ALTER TABLE "wo_details_history"
            ADD CONSTRAINT "wo_details_history_wo_detail_id_wo_details_id_fk"
            FOREIGN KEY ("wo_detail_id") REFERENCES "wo_details" ("id") ON DELETE CASCADE;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS "idx_wo_details_history_detail"
    ON "wo_details_history" ("wo_detail_id", "created_at");
CREATE INDEX IF NOT EXISTS "idx_wo_details_history_page"
    ON "wo_details_history" ("wo_detail_id", "page_no");
