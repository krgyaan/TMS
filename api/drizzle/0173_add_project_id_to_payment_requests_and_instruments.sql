-- Add project_id to payment_requests and payment_instruments
-- Links tendering payment requests/instruments to projects when a request is
-- raised from the project dashboard ("Request BI").

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'payment_requests' AND column_name = 'project_id') THEN
        ALTER TABLE payment_requests ADD COLUMN project_id bigint REFERENCES projects(id) ON DELETE SET NULL;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'payment_instruments' AND column_name = 'project_id') THEN
        ALTER TABLE payment_instruments ADD COLUMN project_id bigint REFERENCES projects(id) ON DELETE SET NULL;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS payment_requests_project_id_idx ON payment_requests(project_id);
CREATE INDEX IF NOT EXISTS payment_instruments_project_id_idx ON payment_instruments(project_id);
