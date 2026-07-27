ALTER TABLE vendor_work_orders ADD COLUMN tds_percentage numeric(5, 2);
ALTER TABLE vendor_work_orders ADD COLUMN tds_amount numeric(14, 2);
ALTER TABLE vendor_work_orders ADD COLUMN amount_after_tds numeric(14, 2);
ALTER TABLE vendor_work_orders ADD COLUMN wo_approved boolean;
ALTER TABLE vendor_work_orders ADD COLUMN wo_approval_remark text;
