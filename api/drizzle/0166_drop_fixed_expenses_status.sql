-- The fixed expense workflow status is no longer stored on the expense itself.
-- It is derived from the linked payment request (fixed_expenses.maker_id).
ALTER TABLE "fixed_expenses" DROP COLUMN IF EXISTS "status";
