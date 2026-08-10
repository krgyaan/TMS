-- Migration 0108: Replace single invoice/receipt columns with JSONB arrays
-- Run AFTER 0106 and 0107

-- 1. Add new JSONB columns for multi-file support
ALTER TABLE amc_bill 
    ADD COLUMN invoices JSONB DEFAULT '[]'::jsonb,
    ADD COLUMN payment_receipts JSONB DEFAULT '[]'::jsonb;

-- 2. Migrate existing data: wrap legacy single file into array
UPDATE amc_bill 
SET invoices = CASE 
    WHEN invoice IS NOT NULL THEN jsonb_build_array(invoice) 
    ELSE '[]'::jsonb END,
    payment_receipts = CASE 
        WHEN payment_receipt IS NOT NULL THEN jsonb_build_array(payment_receipt) 
        ELSE '[]'::jsonb END;

-- 3. Drop legacy columns
ALTER TABLE amc_bill DROP COLUMN invoice, DROP COLUMN payment_receipt;

-- 4. Optional: GIN indexes for JSONB queries
CREATE INDEX amc_bill_invoices_gin ON amc_bill USING GIN (invoices);
CREATE INDEX amc_bill_receipts_gin ON amc_bill USING GIN (payment_receipts);