
ALTER TABLE "fixed_expenses_history" DROP CONSTRAINT IF EXISTS "fixed_expenses_history_expense_id_key";

CREATE INDEX IF NOT EXISTS "idx_fixed_expenses_history_expense_id" ON "fixed_expenses_history" ("expense_id", "id");
