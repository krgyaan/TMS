-- remark becomes required on employee_imprests (Phase 2).
-- Backfill legacy blank rows, then enforce NOT NULL.

UPDATE employee_imprests
SET remark = '-'
WHERE remark IS NULL OR TRIM(remark) = '';

ALTER TABLE employee_imprests ALTER COLUMN remark SET NOT NULL;