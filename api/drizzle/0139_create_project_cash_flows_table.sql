-- Create the project_cash_flows table to track all financial events in a project's lifecycle

CREATE TABLE project_cash_flows (
    id BIGSERIAL PRIMARY KEY,
    project_id BIGINT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    event_type VARCHAR(50) NOT NULL,
    amount NUMERIC(20, 2) NOT NULL,
    direction VARCHAR(20) NOT NULL DEFAULT 'outflow',
    reference_type VARCHAR(50),
    reference_id BIGINT,
    reference_no VARCHAR(255),
    tds_percentage NUMERIC(5, 2),
    tds_amount NUMERIC(14, 2),
    gst_amount NUMERIC(14, 2),
    remark TEXT,
    created_by BIGINT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_cf_project_id ON project_cash_flows (project_id);
CREATE INDEX idx_cf_event_type ON project_cash_flows (event_type);
CREATE INDEX idx_cf_reference ON project_cash_flows (reference_type, reference_id);
CREATE INDEX idx_cf_created_at ON project_cash_flows (created_at);