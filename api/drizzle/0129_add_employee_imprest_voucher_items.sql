-- employee_imprest_voucher_items: explicit many-to-many link between
-- imprest vouchers and the employee imprest entries that make them up.
-- Guarantees no approved imprest is ever missed from its voucher.

CREATE TABLE IF NOT EXISTS employee_imprest_voucher_items (
    voucher_id bigint NOT NULL REFERENCES employee_imprest_vouchers(id) ON DELETE CASCADE,
    imprest_id integer NOT NULL REFERENCES employee_imprests(id) ON DELETE CASCADE,
    created_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (voucher_id, imprest_id)
);

CREATE INDEX IF NOT EXISTS idx_voucher_items_voucher ON employee_imprest_voucher_items(voucher_id);
CREATE INDEX IF NOT EXISTS idx_voucher_items_imprest ON employee_imprest_voucher_items(imprest_id);

-- Backfill (idempotent): link every approved imprest to the voucher(s) whose
-- valid_from..valid_to window covers its approval date. Keeps pre-existing
-- vouchers consistent with the join table so item counts/amounts match.
INSERT INTO employee_imprest_voucher_items (voucher_id, imprest_id)
SELECT v.id, ei.id
FROM employee_imprest_vouchers v
JOIN employee_imprests ei
     ON ei.user_id = v.beneficiary_name::int
    AND ei.approval_status = 1
    AND COALESCE(ei.approved_date)::date BETWEEN v.valid_from::date AND v.valid_to::date
ON CONFLICT (voucher_id, imprest_id) DO NOTHING;