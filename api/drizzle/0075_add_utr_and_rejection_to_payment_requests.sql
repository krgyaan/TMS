ALTER TABLE project_payment_requests
ADD COLUMN utr_number varchar(255),
ADD COLUMN rejection_reason text;
