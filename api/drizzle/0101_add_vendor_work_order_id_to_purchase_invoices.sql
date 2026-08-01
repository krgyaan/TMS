-- Link purchase invoices to vendor work orders (parallel to purchase_order_id)
ALTER TABLE project_purchase_invoices ADD COLUMN vendor_work_order_id bigint;
CREATE INDEX idx_pi_vendor_work_order_id ON project_purchase_invoices (vendor_work_order_id);
