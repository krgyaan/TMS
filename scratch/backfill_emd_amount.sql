-- ============================================================================
-- BACKFILL SCRIPT: Restore emd_amount from tender_infos.emd for active/recommended tenders
-- Target Table: tender_information
-- Scope: Exactly 9 non-rejected rows where emd_required = 'Yes', emd_amount = 0,
--        tender_infos.emd > 0, and te_recommendation = 'YES'.
--
-- EXCLUDED ROWS (27 Rejected Info Sheets - te_recommendation = 'NO'):
-- IDs left out: 3600, 3749, 3858, 3863, 3878, 3887, 3897, 3901, 3915, 3923,
--               3925, 3940, 3942, 3945, 3950, 3965, 3979, 3987, 3988, 3995,
--               4002, 4013, 4037, 4039, 4041, 4042, 4043
-- Why excluded: In the rejection workflow, tender participation is aborted. EMD
-- is never deposited or submitted for rejected tenders. Backfilling active EMD
-- amounts into rejected sheets fabricates payment requirements for abandoned bids.
--
-- SAFETY: Wrapped in a transaction ending with ROLLBACK by default.
--         Change the final ROLLBACK; to COMMIT; when ready to apply.
-- ============================================================================

BEGIN;

-- 1. BEFORE VERIFICATION: Inspect current state of the 9 affected recommended rows
SELECT 
    tin.id AS tender_information_id,
    tin.tender_id,
    tin.created_at AS tin_created_at,
    tin.te_recommendation,
    tin.emd_required,
    tin.emd_amount AS current_tin_emd_amount,
    ti.emd AS tender_infos_emd,
    ti.gst_values AS tender_infos_gst_values
FROM tender_information tin
JOIN tender_infos ti ON ti.id = tin.tender_id
WHERE tin.id IN (
    3823, 3851, 3864, 3880, 3902, 3910, 3941, 3980, 4035
)
ORDER BY tin.id;

-- 2. APPLY UPDATE: Backfill emd_amount from tender_infos.emd for recommended tenders
--    Enforces tight guardrails: id IN (...), emd_amount = 0, emd_required = 'YES',
--    te_recommendation = 'YES', and source emd > 0
UPDATE tender_information tin
SET 
    emd_amount = ti.emd,
    updated_at = NOW()
FROM tender_infos ti
WHERE tin.tender_id = ti.id
  AND tin.id IN (
    3823, 3851, 3864, 3880, 3902, 3910, 3941, 3980, 4035
  )
  AND (tin.emd_amount = 0 OR tin.emd_amount = 0.00)
  AND UPPER(TRIM(tin.emd_required)) = 'YES'
  AND UPPER(TRIM(COALESCE(tin.te_recommendation, 'YES'))) = 'YES'
  AND ti.emd > 0;

-- 3. AFTER VERIFICATION: Check updated values within transaction
SELECT 
    tin.id AS tender_information_id,
    tin.tender_id,
    tin.created_at AS tin_created_at,
    tin.te_recommendation,
    tin.emd_required,
    tin.emd_amount AS updated_tin_emd_amount,
    ti.emd AS tender_infos_emd,
    (tin.emd_amount = ti.emd) AS values_match
FROM tender_information tin
JOIN tender_infos ti ON ti.id = tin.tender_id
WHERE tin.id IN (
    3823, 3851, 3864, 3880, 3902, 3910, 3941, 3980, 4035
)
ORDER BY tin.id;

-- SAFETY DEFAULT: Rollback all changes so script is dry-run reviewable.
-- Change to COMMIT; to permanently apply the backfill.
ROLLBACK;
