-- ============================================================================
-- PAYMENT INSTRUMENTS STATUS MIGRATION
-- Old Status (with prefix) -> New Status (without prefix)
-- ============================================================================
-- Run this migration to update all payment instrument statuses
-- IMPORTANT: Backup your database before running this migration
-- ============================================================================

-- ============================================================================
-- DD STATUSES
-- ============================================================================

UPDATE payment_instruments
SET status = 'PENDING'
WHERE instrument_type = 'DD' AND status = 'DD_ACCOUNTS_FORM_PENDING';

UPDATE payment_instruments
SET status = 'ACCOUNTS_FORM_ACCEPTED'
WHERE instrument_type = 'DD' AND status = 'DD_ACCOUNTS_FORM_ACCEPTED';

UPDATE payment_instruments
SET status = 'ACCOUNTS_FORM_REJECTED'
WHERE instrument_type = 'DD' AND status = 'DD_ACCOUNTS_FORM_REJECTED';

UPDATE payment_instruments
SET status = 'FOLLOWUP_INITIATED'
WHERE instrument_type = 'DD' AND status = 'DD_FOLLOWUP_INITIATED';

UPDATE payment_instruments
SET status = 'RETURN_VIA_COURIER'
WHERE instrument_type = 'DD' AND status = 'DD_RETURN_VIA_COURIER';

UPDATE payment_instruments
SET status = 'RETURN_VIA_BANK_TRANSFER'
WHERE instrument_type = 'DD' AND status = 'DD_RETURN_VIA_BANK_TRANSFER';

UPDATE payment_instruments
SET status = 'SETTLED_WITH_PROJECT'
WHERE instrument_type = 'DD' AND status = 'DD_SETTLED_WITH_PROJECT';

UPDATE payment_instruments
SET status = 'CANCELLATION_REQUESTED'
WHERE instrument_type = 'DD' AND status = 'DD_CANCELLATION_REQUESTED';

UPDATE payment_instruments
SET status = 'CANCELLED'
WHERE instrument_type = 'DD' AND status = 'DD_CANCELLED_AT_BRANCH';

-- ============================================================================
-- FDR STATUSES
-- ============================================================================

UPDATE payment_instruments
SET status = 'PENDING'
WHERE instrument_type = 'FDR' AND status = 'FDR_ACCOUNTS_FORM_PENDING';

UPDATE payment_instruments
SET status = 'ACCOUNTS_FORM_ACCEPTED'
WHERE instrument_type = 'FDR' AND status = 'FDR_ACCOUNTS_FORM_ACCEPTED';

UPDATE payment_instruments
SET status = 'ACCOUNTS_FORM_REJECTED'
WHERE instrument_type = 'FDR' AND status = 'FDR_ACCOUNTS_FORM_REJECTED';

UPDATE payment_instruments
SET status = 'FOLLOWUP_INITIATED'
WHERE instrument_type = 'FDR' AND status = 'FDR_FOLLOWUP_INITIATED';

UPDATE payment_instruments
SET status = 'RETURN_VIA_COURIER'
WHERE instrument_type = 'FDR' AND status = 'FDR_RETURN_VIA_COURIER';

UPDATE payment_instruments
SET status = 'RETURN_VIA_BANK_TRANSFER'
WHERE instrument_type = 'FDR' AND status = 'FDR_RETURN_VIA_BANK_TRANSFER';

UPDATE payment_instruments
SET status = 'SETTLED_WITH_PROJECT'
WHERE instrument_type = 'FDR' AND status = 'FDR_SETTLED_WITH_PROJECT';

UPDATE payment_instruments
SET status = 'CANCELLATION_REQUESTED'
WHERE instrument_type = 'FDR' AND status = 'FDR_CANCELLATION_REQUESTED';

UPDATE payment_instruments
SET status = 'CANCELLED'
WHERE instrument_type = 'FDR' AND status = 'FDR_CANCELLED_AT_BRANCH';

-- ============================================================================
-- BG STATUSES
-- ============================================================================

UPDATE payment_instruments
SET status = 'PENDING'
WHERE instrument_type = 'BG' AND status = 'BG_ACCOUNTS_FORM_PENDING';

UPDATE payment_instruments
SET status = 'ACCOUNTS_FORM_ACCEPTED'
WHERE instrument_type = 'BG' AND status = 'BG_ACCOUNTS_FORM_ACCEPTED';

UPDATE payment_instruments
SET status = 'ACCOUNTS_FORM_REJECTED'
WHERE instrument_type = 'BG' AND status = 'BG_ACCOUNTS_FORM_REJECTED';

UPDATE payment_instruments
SET status = 'BG_CREATED'
WHERE instrument_type = 'BG' AND status = 'BG_CREATED';

UPDATE payment_instruments
SET status = 'FDR_DETAILS_CAPTURED'
WHERE instrument_type = 'BG' AND status = 'BG_FDR_DETAILS_CAPTURED';

UPDATE payment_instruments
SET status = 'FOLLOWUP_INITIATED'
WHERE instrument_type = 'BG' AND status = 'BG_FOLLOWUP_INITIATED';

UPDATE payment_instruments
SET status = 'EXTENSION_REQUESTED'
WHERE instrument_type = 'BG' AND status = 'BG_EXTENSION_REQUESTED';

UPDATE payment_instruments
SET status = 'RETURN_VIA_COURIER'
WHERE instrument_type = 'BG' AND status = 'BG_RETURN_VIA_COURIER';

UPDATE payment_instruments
SET status = 'CANCELLATION_REQUESTED'
WHERE instrument_type = 'BG' AND status = 'BG_CANCELLATION_REQUESTED';

UPDATE payment_instruments
SET status = 'BG_CANCELLATION_CONFIRMED'
WHERE instrument_type = 'BG' AND status = 'BG_BG_CANCELLATION_CONFIRMED';

UPDATE payment_instruments
SET status = 'FDR_CANCELLED_CONFIRMED'
WHERE instrument_type = 'BG' AND status = 'BG_FDR_CANCELLED_CONFIRMED';

-- ============================================================================
-- CHEQUE STATUSES
-- ============================================================================

UPDATE payment_instruments
SET status = 'PENDING'
WHERE instrument_type = 'Cheque' AND status = 'CHEQUE_ACCOUNTS_FORM_PENDING';

UPDATE payment_instruments
SET status = 'ACCOUNTS_FORM_ACCEPTED'
WHERE instrument_type = 'Cheque' AND status = 'CHEQUE_ACCOUNTS_FORM_ACCEPTED';

UPDATE payment_instruments
SET status = 'ACCOUNTS_FORM_REJECTED'
WHERE instrument_type = 'Cheque' AND status = 'CHEQUE_ACCOUNTS_FORM_REJECTED';

UPDATE payment_instruments
SET status = 'FOLLOWUP_INITIATED'
WHERE instrument_type = 'Cheque' AND status = 'CHEQUE_FOLLOWUP_INITIATED';

UPDATE payment_instruments
SET status = 'STOP_REQUESTED'
WHERE instrument_type = 'Cheque' AND status = 'CHEQUE_STOP_FROM_BANK';

UPDATE payment_instruments
SET status = 'DEPOSITED_IN_BANK'
WHERE instrument_type = 'Cheque' AND status = 'CHEQUE_DEPOSITED_IN_BANK';

UPDATE payment_instruments
SET status = 'PAID_VIA_BANK_TRANSFER'
WHERE instrument_type = 'Cheque' AND status = 'CHEQUE_PAID_VIA_BANK_TRANSFER';

UPDATE payment_instruments
SET status = 'CANCELLED_TORN'
WHERE instrument_type = 'Cheque' AND status = 'CHEQUE_CANCELLED_TORN';

-- ============================================================================
-- BANK TRANSFER STATUSES
-- ============================================================================

UPDATE payment_instruments
SET status = 'PENDING'
WHERE instrument_type = 'Bank Transfer' AND status = 'Bank Transfer_ACCOUNTS_FORM_PENDING';

UPDATE payment_instruments
SET status = 'ACCOUNTS_FORM_ACCEPTED'
WHERE instrument_type = 'Bank Transfer' AND status = 'Bank Transfer_ACCOUNTS_FORM_ACCEPTED';

UPDATE payment_instruments
SET status = 'ACCOUNTS_FORM_REJECTED'
WHERE instrument_type = 'Bank Transfer' AND status = 'Bank Transfer_ACCOUNTS_FORM_REJECTED';

UPDATE payment_instruments
SET status = 'FOLLOWUP_INITIATED'
WHERE instrument_type = 'Bank Transfer' AND status = 'Bank Transfer_FOLLOWUP_INITIATED';

UPDATE payment_instruments
SET status = 'RETURN_VIA_BANK_TRANSFER'
WHERE instrument_type = 'Bank Transfer' AND status = 'Bank Transfer_RETURN_VIA_BANK_TRANSFER';

UPDATE payment_instruments
SET status = 'SETTLED_WITH_PROJECT'
WHERE instrument_type = 'Bank Transfer' AND status = 'Bank Transfer_SETTLED_WITH_PROJECT';

-- ============================================================================
-- PORTAL PAYMENT STATUSES
-- ============================================================================

UPDATE payment_instruments
SET status = 'PENDING'
WHERE instrument_type = 'Portal Payment' AND status = 'Portal Payment_ACCOUNTS_FORM_PENDING';

UPDATE payment_instruments
SET status = 'ACCOUNTS_FORM_ACCEPTED'
WHERE instrument_type = 'Portal Payment' AND status = 'Portal Payment_ACCOUNTS_FORM_ACCEPTED';

UPDATE payment_instruments
SET status = 'ACCOUNTS_FORM_REJECTED'
WHERE instrument_type = 'Portal Payment' AND status = 'Portal Payment_ACCOUNTS_FORM_REJECTED';

UPDATE payment_instruments
SET status = 'FOLLOWUP_INITIATED'
WHERE instrument_type = 'Portal Payment' AND status = 'Portal Payment_FOLLOWUP_INITIATED';

UPDATE payment_instruments
SET status = 'RETURN_VIA_BANK_TRANSFER'
WHERE instrument_type = 'Portal Payment' AND status = 'Portal Payment_RETURN_VIA_BANK_TRANSFER';

UPDATE payment_instruments
SET status = 'SETTLED_WITH_PROJECT'
WHERE instrument_type = 'Portal Payment' AND status = 'Portal Payment_SETTLED_WITH_PROJECT';

-- ============================================================================
-- VERIFICATION QUERIES (run these to check before/after)
-- ============================================================================

-- Check counts by instrument_type and old status (before migration)
-- SELECT instrument_type, status, COUNT(*) FROM payment_instruments GROUP BY instrument_type, status ORDER BY instrument_type, status;

-- Check counts by instrument_type and new status (after migration)
-- SELECT instrument_type, status, COUNT(*) FROM payment_instruments GROUP BY instrument_type, status ORDER BY instrument_type, status;