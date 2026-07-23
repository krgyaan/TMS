-- Make project_id nullable (maker requests don't belong to a project)
ALTER TABLE project_payment_requests ALTER COLUMN project_id DROP NOT NULL;

-- Add maker-request columns to the unified table
ALTER TABLE project_payment_requests ADD COLUMN payment_mode VARCHAR(50) NOT NULL DEFAULT 'BANK_TRANSFER';
ALTER TABLE project_payment_requests ADD COLUMN portal_link TEXT;
ALTER TABLE project_payment_requests ADD COLUMN bill_files JSONB NOT NULL DEFAULT '[]';

-- Migrate existing maker_requests into project_payment_requests
INSERT INTO project_payment_requests (
    request_no, party_name, account_number, bank_name, ifsc,
    amount, payment_against, payment_mode, portal_link, bill_files,
    remark, status, utr_number, rejection_reason, requested_by,
    created_at, updated_at
)
SELECT
    request_no, party_name, account_number, bank_name, ifsc,
    amount, category, payment_mode, portal_link, bill_files,
    remark, status, utr_number, rejection_reason, requested_by,
    created_at, updated_at
FROM maker_requests;
