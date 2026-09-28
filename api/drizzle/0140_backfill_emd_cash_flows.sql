-- Backfill EMD outflow cash flows for projects with tender
-- EMD is created on project creation day (day 0) from tender info

INSERT INTO project_cash_flows (project_id, event_type, amount, direction, reference_type, reference_id, reference_no, tds_percentage, tds_amount, gst_amount, remark, created_by, created_at)
SELECT 
  p.id as project_id,
  'emd_outflow' as event_type,
  t.emd as amount,
  'outflow' as direction,
  'tender' as reference_type,
  p.tender_id as reference_id,
  t.tender_no as reference_no,
  NULL as tds_percentage,
  NULL as tds_amount,
  NULL as gst_amount,
  'EMD outflow for tender ' || t.tender_no as remark,
  t.team_member as created_by,
  p.created_at
FROM projects p
JOIN tender_infos t ON p.tender_id = t.id
LEFT JOIN tender_information ti ON t.id = ti.tender_id
WHERE p.tender_id IS NOT NULL
  AND t.emd > 0
  AND (ti.emd_required IS NULL OR ti.emd_required != 'EXEMPT')
  AND p.created_at IS NOT NULL
ON CONFLICT (reference_type, reference_id, event_type) DO NOTHING;

-- Verification: count by event type
SELECT event_type, COUNT(*) as total
FROM project_cash_flows
WHERE event_type = 'emd_outflow'
GROUP BY event_type
ORDER BY event_type;