-- Backfill date_of_expense for legacy rows (approval week grouping preserved)
UPDATE "employee_imprests"
SET "date_of_expense" = COALESCE("approved_date", "created_at")
WHERE "date_of_expense" IS NULL;

-- Permission: users holding this are exempt from the accounts-approved week lock
INSERT INTO "permissions" ("module", "action", "description") VALUES
  ('shared.imprests', 'week-lock-exempt', 'Exempt from imprest week lock (accounts-approved voucher weeks)')
ON CONFLICT (module, action) DO NOTHING;