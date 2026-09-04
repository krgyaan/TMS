-- date_of_expense becomes the single voucher-grouping key (Phase 1 strict).
-- Backfill any legacy rows missing a date, then enforce NOT NULL so the
-- backend can group on date_of_expense without a COALESCE fallback.

-- Backfill (idempotent): derive date_of_expense from approval date, else
-- created_at, for rows where it is still NULL.
UPDATE employee_imprests
SET date_of_expense = COALESCE(approved_date, created_at)
WHERE date_of_expense IS NULL;

-- Enforce the new invariant. Safe after the backfill above.
ALTER TABLE employee_imprests ALTER COLUMN date_of_expense SET NOT NULL;