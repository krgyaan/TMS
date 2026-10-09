CREATE TABLE gst2b_reco (
    id bigserial NOT NULL PRIMARY KEY,
    project_id bigint NOT NULL REFERENCES projects(id),
    po_id bigint NOT NULL REFERENCES purchase_orders(id),
    invoice_id bigint NOT NULL REFERENCES "project_purchase_invoices"(id),
    invoice_date date NOT NULL,
    invoice_uploaded_at timestamp NOT NULL,
    gst_amount numeric(14,2) NOT NULL,
    created_at timestamp NOT NULL DEFAULT now(),
    UNIQUE(po_id, invoice_id)
);