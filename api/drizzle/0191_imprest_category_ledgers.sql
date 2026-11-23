-- Tally category-to-ledger mapping on the imprest category master. Categories
-- are blocked from Tally posting by flag, independent of having a ledger.

ALTER TABLE "imprest_categories" ADD COLUMN IF NOT EXISTS "tally_ledger_id" bigint
    REFERENCES "tally_ledgers"("id") ON DELETE SET NULL;
ALTER TABLE "imprest_categories" ADD COLUMN IF NOT EXISTS "tally_blocked" boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS "idx_imprest_categories_tally_ledger" ON "imprest_categories" ("tally_ledger_id");

UPDATE "imprest_categories" SET "tally_blocked" = true WHERE "id" IN (7,8,10,19,22,23,32,33,37);
