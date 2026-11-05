-- Who approved/moved the workflow status (Maker Done, Payment Done, Rejected,
-- Revert). `updated_by` now only tracks data edits, so keep them separate.

ALTER TABLE "fixed_expenses_history" ADD COLUMN IF NOT EXISTS "approved_by" bigint REFERENCES "users"("id");
