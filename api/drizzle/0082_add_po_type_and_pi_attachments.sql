ALTER TABLE purchase_orders
  ADD COLUMN po_type varchar(20) NOT NULL DEFAULT 'new',
  ADD COLUMN pi_attachments text;
