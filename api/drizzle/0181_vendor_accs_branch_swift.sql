-- Vendor sheet bank details include branch and, for some banks, a SWIFT code.
ALTER TABLE vendor_accs ADD COLUMN IF NOT EXISTS branch varchar(255);
ALTER TABLE vendor_accs ADD COLUMN IF NOT EXISTS swift_code varchar(50);
