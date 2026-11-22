-- Tally ledger master synced from TallyPrime, plus the three employee ledger
-- links stored on the user row. Ledgers are deactivated, never deleted, because
-- users reference them.

CREATE TABLE IF NOT EXISTS "tally_ledgers" (
    "id" bigserial NOT NULL PRIMARY KEY,
    "company" varchar(255) NOT NULL,
    "name" varchar(255) NOT NULL,
    "name_normalized" varchar(255) NOT NULL,
    "parent" varchar(255),
    "guid" varchar(100),
    "is_active" boolean NOT NULL DEFAULT true,
    "last_seen_at" timestamp with time zone NOT NULL DEFAULT now(),
    "created_at" timestamp with time zone NOT NULL DEFAULT now(),
    "updated_at" timestamp with time zone NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS "uq_tally_ledgers_name" ON "tally_ledgers" ("company", "name_normalized");
CREATE UNIQUE INDEX IF NOT EXISTS "uq_tally_ledgers_guid" ON "tally_ledgers" ("company", "guid") WHERE "guid" IS NOT NULL;
CREATE INDEX IF NOT EXISTS "idx_tally_ledgers_parent" ON "tally_ledgers" ("company", "parent");
CREATE INDEX IF NOT EXISTS "idx_tally_ledgers_active" ON "tally_ledgers" ("company", "is_active");

ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "imprest_ledger_id" bigint REFERENCES "tally_ledgers"("id") ON DELETE SET NULL;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "salary_ledger_id" bigint REFERENCES "tally_ledgers"("id") ON DELETE SET NULL;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "salary_payable_ledger_id" bigint REFERENCES "tally_ledgers"("id") ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS "users_imprest_ledger_idx" ON "users" ("imprest_ledger_id");
CREATE INDEX IF NOT EXISTS "users_salary_ledger_idx" ON "users" ("salary_ledger_id");
CREATE INDEX IF NOT EXISTS "users_salary_payable_ledger_idx" ON "users" ("salary_payable_ledger_id");
