-- Add upload file fields for maker request conditional uploads
ALTER TABLE project_payment_requests ADD COLUMN upload_invoice JSONB NOT NULL DEFAULT '[]';
ALTER TABLE project_payment_requests ADD COLUMN upload_pi JSONB NOT NULL DEFAULT '[]';
ALTER TABLE project_payment_requests ADD COLUMN upload_invoice_after_payment JSONB NOT NULL DEFAULT '[]';