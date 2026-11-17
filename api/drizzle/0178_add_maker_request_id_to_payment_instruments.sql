-- Link auto-created maker requests (operations project_payment_requests) to the
-- tendering payment instrument they originated from, so maker status updates
-- can propagate to payment_instruments.status / action.

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'payment_instruments' AND column_name = 'maker_request_id'
    ) THEN
        ALTER TABLE payment_instruments ADD COLUMN maker_request_id bigint;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS instruments_maker_request_id_idx
    ON payment_instruments(maker_request_id);