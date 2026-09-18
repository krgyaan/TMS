-- Backfill project_cash_flows from existing data

-- 1. PO Created events
INSERT INTO project_cash_flows (projectId, eventType, amount, direction, referenceType, referenceId, referenceNo, tdsPercentage, tdsAmount, gstAmount, remark, createdBy, createdAt)
SELECT
  p.projectId,
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
WHERE p.amount_after_tds IS NOT NULL;

-- 2. VWO Created events
INSERT INTO project_cash_flows (projectId, eventType, amount, direction, referenceType, referenceId, referenceNo, tdsPercentage, tdsAmount, gstAmount, remark, createdBy, created_at)
SELECT
  v.projectId,
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
WHERE v.amount_after_tds IS NOT NULL;

-- 2b. PO Approved events (only for approved POs)
INSERT INTO project_cash_flows (projectId, eventType, amount, direction, referenceType, referenceId, referenceNo, tdsPercentage, tdsAmount, gstAmount, remark, createdBy, created_at)
SELECT
  p.projectId,
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
  p.approved_by,
  p.approved_at
FROM purchase_orders p
WHERE p.po_approved = true AND p.tds_percentage IS NOT NULL;

-- 2c. VWO Approved events
INSERT INTO project_cash_flows (projectId, eventType, amount, direction, referenceType, referenceId, referenceNo, tdsPercentage, tdsAmount, gstAmount, remark, createdBy, created_at)
SELECT
  v.projectId,
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
  v.approved_by,
  v.approved_at
FROM vendor_work_orders v
WHERE v.wo_approved = true AND v.tds_percentage IS NOT NULL;

-- 3. Payment Requested events
INSERT INTO project_cash_flows (projectId, eventType, amount, direction, referenceType, referenceId, referenceNo, tdsPercentage, tdsAmount, gstAmount, remark, createdBy, created_at)
SELECT
  pr.projectId,
  'payment_requested',
  pr.amount,
  'outflow',
  'payment_request',
  pr.id,
  pr.request_no,
  pr.tds_percentage,
  pr.tds_amount,
  NULL::numeric,
  'Payment requested against ' || pr.payment_against || ' for ' || COALESCE(pr.projectName, '—'),
  pr.requested_by,
  pr.created_at
FROM project_payment_requests pr;

-- 4. Payment Approved events (maker_done)
INSERT INTO project_cash_flows (projectId, eventType, amount, direction, referenceType, referenceId, referenceNo, tdsPercentage, tdsAmount, gstAmount, remark, createdBy, created_at)
SELECT
  pr.projectId,
  'payment_approved',
  pr.amount,
  'outflow',
  'payment_request',
  pr.id,
  pr.request_no,
  pr.tds_percentage,
  pr.tds_amount,
  NULL::numeric,
  'Payment approved by maker for ' || pr.payment_against,
  pr.requested_by,
  pr.updated_at
FROM project_payment_requests pr
WHERE pr.status = 'maker_done';

-- 5. Payment Paid events (backfill with createdBy = 42 as specified)
INSERT INTO project_cash_flows (projectId, eventType, amount, direction, referenceType, referenceId, referenceNo, tdsPercentage, tdsAmount, gstAmount, remark, createdBy, created_at)
SELECT
  pr.projectId,
  'payment_paid',
  pr.amount,
  'outflow',
  'payment_request',
  pr.id,
  pr.request_no,
  pr.tds_percentage,
  pr.tds_amount,
  NULL::numeric,
  'Payment done. UTR: ' || COALESCE(pr.utrNumber, 'N/A'),
  42,  -- backfill fixed value as specified
  pr.updated_at
FROM project_payment_requests pr
WHERE pr.status = 'payment_done';

-- 5b. Payment Paid events for new entries (createdBy = current user)
-- This is a template; actual value will be provided at runtime
-- INSERT INTO project_cash_flows (...)
-- SELECT ...

-- 6. Invoice Uploaded events
INSERT INTO project_cash_flows (projectId, eventType, amount, direction, referenceType, referenceId, referenceNo, tdsPercentage, tdsAmount, gstAmount, remark, createdBy, created_at)
SELECT
  pi.projectId,
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
FROM project_purchase_invoices pi;

-- 7. GST Booked events
INSERT INTO project_cash_flows (projectId, eventType, amount, direction, referenceType, referenceId, referenceNo, tdsPercentage, tdsAmount, gstAmount, remark, createdBy, created_at)
SELECT
  pi.projectId,
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
WHERE COALESCE(pi.gst_amount, 0) > 0;

-- 8. Verification: count by event type
SELECT eventType, COUNT(*) as total
FROM project_cash_flows
GROUP BY eventType
ORDER BY eventType;