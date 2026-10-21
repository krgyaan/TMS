-- Add VWO support to TDS returns and GST 2B reconciliation tables.
-- PO-linked rows stay as-is; VWO-linked rows use vwo_id. Exactly one of
-- po_id / vwo_id is set per row (enforced by chk_*_document).
-- Uniqueness moves from (po_id, pr_id)/(po_id, invoice_id) to the single
-- owning document reference (a PR belongs to one document; an invoice too).

ALTER TABLE tds_returns ALTER COLUMN po_id DROP NOT NULL;
ALTER TABLE tds_returns ADD COLUMN vwo_id bigint REFERENCES vendor_work_orders(id);
CREATE INDEX idx_tr_vwo_id ON tds_returns(vwo_id);
ALTER TABLE tds_returns DROP CONSTRAINT tds_returns_po_id_pr_id_key;
ALTER TABLE tds_returns ADD CONSTRAINT uq_tr_pr_id UNIQUE (pr_id);
ALTER TABLE tds_returns ADD CONSTRAINT chk_tr_document CHECK (
    (po_id IS NOT NULL AND vwo_id IS NULL) OR (po_id IS NULL AND vwo_id IS NOT NULL)
);

ALTER TABLE gst2b_reco ALTER COLUMN po_id DROP NOT NULL;
ALTER TABLE gst2b_reco ADD COLUMN vwo_id bigint REFERENCES vendor_work_orders(id);
CREATE INDEX idx_gr_vwo_id ON gst2b_reco(vwo_id);
ALTER TABLE gst2b_reco DROP CONSTRAINT gst2b_reco_po_id_invoice_id_key;
ALTER TABLE gst2b_reco ADD CONSTRAINT uq_gr_invoice_id UNIQUE (invoice_id);
ALTER TABLE gst2b_reco ADD CONSTRAINT chk_gr_document CHECK (
    (po_id IS NOT NULL AND vwo_id IS NULL) OR (po_id IS NULL AND vwo_id IS NOT NULL)
);
