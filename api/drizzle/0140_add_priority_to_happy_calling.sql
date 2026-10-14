-- Add a priority column to happy_calling so entries can be filtered and
-- prioritised alongside leads.

ALTER TABLE happy_calling ADD COLUMN IF NOT EXISTS lead_priority VARCHAR(50);

UPDATE happy_calling SET lead_priority = 'Cold' WHERE lead_priority IS NULL;

ALTER TABLE happy_calling ALTER COLUMN lead_priority SET DEFAULT 'Cold';

CREATE INDEX IF NOT EXISTS idx_happy_calling_priority ON happy_calling (lead_priority);