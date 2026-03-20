-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- 1. Count updated records
SELECT 
    COUNT(*) FILTER (WHERE updated_at > NOW() - INTERVAL '1 hour') as recently_updated,
    COUNT(*) FILTER (WHERE generated_pdf LIKE '%/%') as with_new_format,
    COUNT(*) as total
FROM payment_instruments;

-- 2. Sample updated paths (FDR)
SELECT id, legacy_fdr_id, generated_pdf, docket_slip, updated_at
FROM payment_instruments
WHERE legacy_fdr_id IS NOT NULL
  AND updated_at > NOW() - INTERVAL '1 hour'
LIMIT 10;

-- 3. Sample updated paths (BG)
SELECT id, legacy_bg_id, generated_pdf, docket_slip, updated_at
FROM payment_instruments
WHERE legacy_bg_id IS NOT NULL
  AND updated_at > NOW() - INTERVAL '1 hour'
LIMIT 10;

-- 4. Check for missing prefixes
SELECT id, generated_pdf
FROM payment_instruments
WHERE generated_pdf IS NOT NULL
  AND generated_pdf NOT LIKE '%/%'
LIMIT 20;

-- 5. Verify BG details
SELECT ibd.id, ibd.instrument_id, ibd.bg_soft_copy, ibd.prefilled_signed_bg
FROM instrument_bg_details ibd
JOIN payment_instruments pi ON pi.id = ibd.instrument_id
WHERE pi.updated_at > NOW() - INTERVAL '1 hour'
LIMIT 10;
