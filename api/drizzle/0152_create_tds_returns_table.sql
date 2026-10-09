CREATE TABLE tds_returns (
    id bigserial NOT NULL PRIMARY KEY,
    project_id bigint NOT NULL REFERENCES projects(id),
    po_id bigint NOT NULL REFERENCES purchase_orders(id),
    pr_id bigint NOT NULL REFERENCES "project_payment_requests"(id),
    tds_amount numeric(14,2) NOT NULL,
    tds_return_date date NOT NULL,
    invoice_date date,
    invoice_uploaded_at timestamp,
    created_at timestamp NOT NULL DEFAULT now(),
    UNIQUE(po_id, pr_id)
);