-- Backfill project_cash_flows from existing data

-- First, create unique index for idempotency
CREATE UNIQUE INDEX IF NOT EXISTS idx_cf_unique_event 
ON project_cash_flows (reference_type, reference_id, event_type);

-- 1. PO Created events
INSERT INTO project_cash_flows (project_id, event_type, amount, direction, reference_type, reference_id, reference_no, tds_percentage, tds_amount, gst_amount, remark, created_by, created_at)
SELECT
  p.project_id,
  'po_created',
  p.amount_after_tds,
  'outflow',
  'purchase_order',
  p.id,
  p.po_number,
  p.tds_percentage,
  p.tds_amount,
  NULL::numeric,
  'PO created with TDS @ ' || p.tds_percentage || '%',
  p.po_raised_by,
  p.created_at
FROM purchase_orders p
WHERE p.amount_after_tds IS NOT NULL
ON CONFLICT (reference_type, reference_id, event_type) DO NOTHING;

-- 2. VWO Created events
INSERT INTO project_cash_flows (project_id, event_type, amount, direction, reference_type, reference_id, reference_no, tds_percentage, tds_amount, gst_amount, remark, created_by, created_at)
SELECT
  v.project_id,
  'vwo_created',
  v.amount_after_tds,
  'outflow',
  'vendor_work_order',
  v.id,
  v.wo_number,
  v.tds_percentage,
  v.tds_amount,
  NULL::numeric,
  'VWO created with TDS @ ' || v.tds_percentage || '%',
  v.wo_raised_by,
  v.created_at
FROM vendor_work_orders v
WHERE v.amount_after_tds IS NOT NULL
ON CONFLICT (reference_type, reference_id, event_type) DO NOTHING;

-- 2b. PO Approved events (only for approved POs)
-- Note: approved_by/approved_at columns don't exist, using po_raised_by/created_at as approximation
INSERT INTO project_cash_flows (project_id, event_type, amount, direction, reference_type, reference_id, reference_no, tds_percentage, tds_amount, gst_amount, remark, created_by, created_at)
SELECT
  p.project_id,
  'po_approved',
  p.amount_after_tds,
  'outflow',
  'purchase_order',
  p.id,
  p.po_number,
  p.tds_percentage,
  p.tds_amount,
  NULL::numeric,
  'PO approved with TDS @ ' || p.tds_percentage || '%',
  p.po_raised_by,
  p.created_at
FROM purchase_orders p
WHERE p.po_approved = true AND p.tds_percentage IS NOT NULL
ON CONFLICT (reference_type, reference_id, event_type) DO NOTHING;

-- 2c. VWO Approved events
-- Note: approved_by/approved_at columns don't exist, using wo_raised_by/created_at as approximation
INSERT INTO project_cash_flows (project_id, event_type, amount, direction, reference_type, reference_id, reference_no, tds_percentage, tds_amount, gst_amount, remark, created_by, created_at)
SELECT
  v.project_id,
  'vwo_approved',
  v.amount_after_tds,
  'outflow',
  'vendor_work_order',
  v.id,
  v.wo_number,
  v.tds_percentage,
  v.tds_amount,
  NULL::numeric,
  'VWO approved with TDS @ ' || v.tds_percentage || '%',
  v.wo_raised_by,
  v.created_at
FROM vendor_work_orders v
WHERE v.wo_approved = true AND v.tds_percentage IS NOT NULL
ON CONFLICT (reference_type, reference_id, event_type) DO NOTHING;

-- 3. Payment Requested events
-- Note: tds_amount column doesn't exist, using calculated value
INSERT INTO project_cash_flows (project_id, event_type, amount, direction, reference_type, reference_id, reference_no, tds_percentage, tds_amount, gst_amount, remark, created_by, created_at)
SELECT
  pr.project_id,
  'payment_requested',
  pr.amount,
  'outflow',
  'payment_request',
  pr.id,
  pr.request_no,
  pr.tds_percentage,
  CASE WHEN pr.tds_percentage IS NOT NULL THEN (pr.amount * pr.tds_percentage / 100) ELSE 0 END,
  NULL::numeric,
  'Payment requested against ' || pr.payment_against || ' for ' || COALESCE(p.project_name, '—'),
  pr.requested_by,
  pr.created_at
FROM project_payment_requests pr
LEFT JOIN projects p ON pr.project_id = p.id
WHERE pr.project_id IS NOT NULL
ON CONFLICT (reference_type, reference_id, event_type) DO NOTHING;

-- 4. Payment Approved events (maker_done)
-- Note: created_by uses requested_by as approximation (actual maker user not tracked)
-- Note: tds_amount column doesn't exist, using calculated value
INSERT INTO project_cash_flows (project_id, event_type, amount, direction, reference_type, reference_id, reference_no, tds_percentage, tds_amount, gst_amount, remark, created_by, created_at)
SELECT
  pr.project_id,
  'payment_approved',
  pr.amount,
  'outflow',
  'payment_request',
  pr.id,
  pr.request_no,
  pr.tds_percentage,
  CASE WHEN pr.tds_percentage IS NOT NULL THEN (pr.amount * pr.tds_percentage / 100) ELSE 0 END,
  NULL::numeric,
  'Payment approved by maker for ' || pr.payment_against,
  pr.requested_by,
  pr.updated_at
FROM project_payment_requests pr
WHERE pr.status = 'maker_done' AND pr.project_id IS NOT NULL
ON CONFLICT (reference_type, reference_id, event_type) DO NOTHING;

-- 5. Payment Paid events
-- Note: created_by uses requested_by as approximation (actual payer user not tracked)
-- Note: tds_amount column doesn't exist, using calculated value
INSERT INTO project_cash_flows (project_id, event_type, amount, direction, reference_type, reference_id, reference_no, tds_percentage, tds_amount, gst_amount, remark, created_by, created_at)
SELECT
  pr.project_id,
  'payment_paid',
  pr.amount,
  'outflow',
  'payment_request',
  pr.id,
  pr.request_no,
  pr.tds_percentage,
  CASE WHEN pr.tds_percentage IS NOT NULL THEN (pr.amount * pr.tds_percentage / 100) ELSE 0 END,
  NULL::numeric,
  'Payment done. UTR: ' || COALESCE(pr.utr_number, 'N/A'),
  pr.requested_by,
  pr.updated_at
FROM project_payment_requests pr
WHERE pr.status = 'payment_done' AND pr.project_id IS NOT NULL
ON CONFLICT (reference_type, reference_id, event_type) DO NOTHING;

-- 5b. Payment Paid events for new entries (created_by = current user)
-- This is a template; actual value will be provided at runtime
-- INSERT INTO project_cash_flows (...)
-- SELECT ...

-- 6. Invoice Uploaded events
INSERT INTO project_cash_flows (project_id, event_type, amount, direction, reference_type, reference_id, reference_no, tds_percentage, tds_amount, gst_amount, remark, created_by, created_at)
SELECT
  pi.project_id,
  'invoice_uploaded',
  COALESCE(pi.value_pre_gst, 0) + COALESCE(pi.gst_amount, 0),
  'outflow',
  'purchase_invoice',
  pi.id,
  pi.invoice_no,
  NULL::numeric,
  NULL::numeric,
  COALESCE(pi.gst_amount, 0),
  'Purchase invoice uploaded: ' || pi.invoice_no,
  pi.uploaded_by,
  pi.created_at
FROM project_purchase_invoices pi
ON CONFLICT (reference_type, reference_id, event_type) DO NOTHING;

-- 7. GST Booked events
INSERT INTO project_cash_flows (project_id, event_type, amount, direction, reference_type, reference_id, reference_no, tds_percentage, tds_amount, gst_amount, remark, created_by, created_at)
SELECT
  pi.project_id,
  'gst_booked',
  COALESCE(pi.gst_amount, 0),
  'adjustment',
  'purchase_invoice',
  pi.id,
  pi.invoice_no,
  NULL::numeric,
  NULL::numeric,
  COALESCE(pi.gst_amount, 0),
  'GST @ 18% booked on invoice ' || pi.invoice_no,
  pi.uploaded_by,
  pi.created_at
FROM project_purchase_invoices pi
WHERE COALESCE(pi.gst_amount, 0) > 0
ON CONFLICT (reference_type, reference_id, event_type) DO NOTHING;

-- 8. Verification: count by event type
SELECT event_type, COUNT(*) as total
FROM project_cash_flows
GROUP BY event_type
ORDER BY event_type;