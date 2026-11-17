-- Add project_id to payment_requests.
-- Links tendering payment requests to projects when a request is raised from
-- the project dashboard ("Request BI").
-- Instruments are linked to a project through their parent request, so
-- payment_instruments intentionally has no project_id column.

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'payment_requests' AND column_name = 'project_id') THEN
        ALTER TABLE payment_requests ADD COLUMN project_id bigint REFERENCES projects(id) ON DELETE SET NULL;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS payment_requests_project_id_idx ON payment_requests(project_id);
