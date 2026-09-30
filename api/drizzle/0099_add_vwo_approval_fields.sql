ALTER TABLE vendor_work_orders ADD COLUMN IF NOT EXISTS tds_percentage numeric(5, 2);
ALTER TABLE vendor_work_orders ADD COLUMN IF NOT EXISTS tds_amount numeric(14, 2);
ALTER TABLE vendor_work_orders ADD COLUMN IF NOT EXISTS amount_after_tds numeric(14, 2);
ALTER TABLE vendor_work_orders ADD COLUMN IF NOT EXISTS wo_approved boolean;
ALTER TABLE vendor_work_orders ADD COLUMN IF NOT EXISTS wo_approval_remark text;
