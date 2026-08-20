-- insurance_policy_links: many-to-many between insurance policies and payment entries
-- (payment requests, maker requests, imprests). Allows multiple payments per policy
-- (1st purchase, renewals, etc.)

CREATE TABLE IF NOT EXISTS insurance_policy_links (
    id serial PRIMARY KEY,
    insurance_policy_id integer NOT NULL REFERENCES insurance_policies(id) ON DELETE CASCADE,
    link_type varchar(30) NOT NULL DEFAULT 'purchase',
    payment_request_id bigint REFERENCES project_payment_requests(id) ON DELETE SET NULL,
    maker_request_id bigint REFERENCES project_payment_requests(id) ON DELETE SET NULL,
    imprest_id integer REFERENCES employee_imprests(id) ON DELETE SET NULL,
    created_by integer NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT insurance_policy_links_target_check CHECK (
        (payment_request_id IS NOT NULL)::int + (maker_request_id IS NOT NULL)::int + (imprest_id IS NOT NULL)::int = 1
    )
);

CREATE INDEX IF NOT EXISTS idx_insurance_policy_links_policy ON insurance_policy_links(insurance_policy_id);
CREATE INDEX IF NOT EXISTS idx_insurance_policy_links_payment ON insurance_policy_links(payment_request_id);
CREATE INDEX IF NOT EXISTS idx_insurance_policy_links_maker ON insurance_policy_links(maker_request_id);
CREATE INDEX IF NOT EXISTS idx_insurance_policy_links_imprest ON insurance_policy_links(imprest_id);

-- Backfill from legacy single-link columns (idempotent)
INSERT INTO insurance_policy_links (insurance_policy_id, link_type, payment_request_id, created_by, created_at)
SELECT id, 'purchase', payment_request_id, created_by, created_at
FROM insurance_policies
WHERE payment_request_id IS NOT NULL;

INSERT INTO insurance_policy_links (insurance_policy_id, link_type, maker_request_id, created_by, created_at)
SELECT id, 'purchase', maker_request_id, created_by, created_at
FROM insurance_policies
WHERE maker_request_id IS NOT NULL AND payment_request_id IS NULL;

INSERT INTO insurance_policy_links (insurance_policy_id, link_type, imprest_id, created_by, created_at)
SELECT id, 'purchase', imprest_id, created_by, created_at
FROM insurance_policies
WHERE imprest_id IS NOT NULL;