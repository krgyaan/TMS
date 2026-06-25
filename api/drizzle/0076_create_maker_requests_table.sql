CREATE TABLE maker_requests (
    id BIGSERIAL PRIMARY KEY,
    request_no VARCHAR(255),
    party_name VARCHAR(255),
    account_number VARCHAR(100),
    bank_name VARCHAR(255),
    ifsc VARCHAR(50),
    amount NUMERIC(20,2),
    category_id BIGINT REFERENCES imprest_categories(id),
    bill_files JSONB DEFAULT '[]',
    remark TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    utr_number TEXT,
    rejection_reason TEXT,
    requested_by BIGINT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_mr_request_no ON maker_requests(request_no);
CREATE INDEX idx_mr_status ON maker_requests(status);
CREATE INDEX idx_mr_requested_by ON maker_requests(requested_by);
