
CREATE TABLE IF NOT EXISTS other_contacts (
    id serial PRIMARY KEY,
    name varchar(255) NOT NULL,
    designation varchar(255),
    email varchar(255),
    phone varchar(20),
    purpose varchar(255),
    created_by bigint,
    created_at timestamp NOT NULL DEFAULT now(),
    updated_at timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_other_contacts_purpose ON other_contacts (purpose);
