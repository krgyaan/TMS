-- ============================================================================
-- ROLLBACK SCRIPT
-- ============================================================================
-- Generated: 2026-03-12T11:52:35.892Z
-- ============================================================================

-- Restore from backup tables

-- Restore payment_instruments
UPDATE payment_instruments pi
SET 
    generated_pdf = b.generated_pdf,
    docket_slip = b.docket_slip,
    extension_request_pdf = b.extension_request_pdf,
    cancellation_request_pdf = b.cancellation_request_pdf,
    updated_at = b.updated_at
FROM payment_instruments_backup b
WHERE pi.id = b.id;

-- Restore instrument_bg_details
UPDATE instrument_bg_details ibd
SET 
    bg_soft_copy = b.bg_soft_copy,
    bg_po = b.bg_po,
    approve_bg = b.approve_bg,
    -- ... (all fields)
FROM instrument_bg_details_backup b
WHERE ibd.id = b.id;
