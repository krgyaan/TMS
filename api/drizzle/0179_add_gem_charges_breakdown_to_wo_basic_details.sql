-- GeM charges payment request breakdown on WO Basic Details.
-- The auto-created maker/payment request amount is the net payable
-- (pre-GST + 18% GST - 2% TDS calculated on the pre-GST amount).

ALTER TABLE wo_basic_details ADD COLUMN IF NOT EXISTS gem_charges_pre_gst_amount numeric(20, 2);
ALTER TABLE wo_basic_details ADD COLUMN IF NOT EXISTS gem_charges_gst_amount numeric(20, 2);
ALTER TABLE wo_basic_details ADD COLUMN IF NOT EXISTS gem_charges_total_payable numeric(20, 2);
ALTER TABLE wo_basic_details ADD COLUMN IF NOT EXISTS gem_charges_tds_amount numeric(20, 2);
ALTER TABLE wo_basic_details ADD COLUMN IF NOT EXISTS gem_charges_net_payable numeric(20, 2);
