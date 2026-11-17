-- Remove project_id from payment_instruments.
-- Instrument-to-project linkage is derived from payment_requests.project_id,
-- so storing it again on the instrument is redundant.

DROP INDEX IF EXISTS payment_instruments_project_id_idx;
ALTER TABLE payment_instruments DROP COLUMN IF EXISTS project_id;
