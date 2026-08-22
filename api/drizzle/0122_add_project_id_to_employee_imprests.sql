-- Add project_id to employee_imprests table
-- This links imprests to projects for multi-tenancy and tracking

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'employee_imprests' AND column_name = 'project_id') THEN
        ALTER TABLE employee_imprests ADD COLUMN project_id bigint REFERENCES projects(id) ON DELETE SET NULL;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_employee_imprests_project_id ON employee_imprests(project_id);
