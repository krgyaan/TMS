ALTER TABLE purchase_orders
  ADD COLUMN tds_percentage numeric(5,2),
  ADD COLUMN tds_amount numeric(14,2),
  ADD COLUMN amount_after_tds numeric(14,2);
