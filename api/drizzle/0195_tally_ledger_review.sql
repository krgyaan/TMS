-- Per-entry Tally ledger override + category context ledgers for auto-suggestion.

ALTER TABLE "employee_imprests" ADD COLUMN IF NOT EXISTS "tally_ledger_id" bigint
    REFERENCES "tally_ledgers"("id") ON DELETE SET NULL;
ALTER TABLE "employee_imprests" ADD COLUMN IF NOT EXISTS "tally_ledger_source" varchar(10) NOT NULL DEFAULT 'auto';
ALTER TABLE "employee_imprests" ADD COLUMN IF NOT EXISTS "tally_ledger_reviewed_by" bigint
    REFERENCES "users"("id") ON DELETE SET NULL;
ALTER TABLE "employee_imprests" ADD COLUMN IF NOT EXISTS "tally_ledger_reviewed_at" timestamp with time zone;
ALTER TABLE "employee_imprests" ADD COLUMN IF NOT EXISTS "tally_ledger_note" varchar(500);

CREATE INDEX IF NOT EXISTS "idx_employee_imprests_tally_ledger" ON "employee_imprests" ("tally_ledger_id");

ALTER TABLE "imprest_categories" ADD COLUMN IF NOT EXISTS "project_ledger_id" bigint
    REFERENCES "tally_ledgers"("id") ON DELETE SET NULL;
ALTER TABLE "imprest_categories" ADD COLUMN IF NOT EXISTS "business_development_ledger_id" bigint
    REFERENCES "tally_ledgers"("id") ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS "idx_imprest_categories_project_ledger" ON "imprest_categories" ("project_ledger_id");
CREATE INDEX IF NOT EXISTS "idx_imprest_categories_bd_ledger" ON "imprest_categories" ("business_development_ledger_id");
