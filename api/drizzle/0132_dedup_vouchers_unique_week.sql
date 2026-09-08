-- 0132: Dedup legacy vouchers + unique week enforcement (Phase 3 — amount & lifecycle integrity)
-- Idempotent: dedup deletes rows that shouldn't exist; advisory lock in code prevents dupes.

-- 1. Delete non-canonical duplicate vouchers.
--    Per (beneficiary_name, valid_from::date, valid_to::date), keep ONE canonical row
--    (prefer: accounts_signed_by set, then admin_signed_by set, then lowest id).
--    All legacy duplicates have 0 linked voucher_items; nothing to rewire.
WITH ranked AS (
  SELECT
    v.id,
    ROW_NUMBER() OVER (
      PARTITION BY v.beneficiary_name, v.valid_from::date, v.valid_to::date
      ORDER BY
        (CASE WHEN TRIM(COALESCE(v.accounts_signed_by, '')) <> '' THEN 1 ELSE 0 END) DESC,
        (CASE WHEN TRIM(COALESCE(v.admin_signed_by,  '')) <> '' THEN 1 ELSE 0 END) DESC,
        v.id ASC
    ) AS rn
  FROM employee_imprest_vouchers v
)
DELETE FROM employee_imprest_vouchers v
USING ranked r
WHERE v.id = r.id
  AND r.rn > 1;

-- 2. UNIQUE index not possible (timestamptz::date is not IMMUTABLE in PG).
--    Uniqueness is enforced at the application layer:
--    buildVoucherIfMissing uses pg_advisory_xact_lock + INSERT ON CONFLICT DO NOTHING + re-select.
