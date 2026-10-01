-- Closure was a derived state, not a stored one: the "Closed" tab on both the PO
-- and VWO lists was computed from "fully paid AND fully invoiced", and
-- closeVendorWorkOrder only wrote `updated_at` — a no-op write. Two consequences:
--
--   * 20 POs and 6 VWOs already appear as Closed with nobody having closed them,
--     so there was no such thing as a decision to close.
--   * A `close` permission would have granted nothing.
--
-- This makes closure an explicit, auditable event. `closed_at` is a timestamp
-- rather than a boolean so the audit trail survives; the backfill preserves the
-- current tab membership of the 20 + 6 rows, so no row moves between tabs as a
-- result of deploying this migration.

ALTER TABLE "purchase_orders" ADD COLUMN IF NOT EXISTS "closed_at" timestamp with time zone;
ALTER TABLE "vendor_work_orders" ADD COLUMN IF NOT EXISTS "closed_at" timestamp with time zone;

-- ---------------------------------------------------------------------------
-- Backfill: apply the exact predicate the status filters used before this change.
-- ---------------------------------------------------------------------------

UPDATE "purchase_orders" po
SET "closed_at" = now()
WHERE po."po_approved" = true
  AND (SELECT COALESCE(SUM(pr."amount"::numeric), 0)
         FROM "project_payment_requests" pr
        WHERE pr."purchase_order_id" = po."id" AND pr."status" = 'payment_done')
      >= COALESCE(po."amount_after_tds"::numeric,
                  (SELECT SUM(pop."total_amount"::numeric)
                     FROM "purchase_order_products" pop
                    WHERE pop."purchase_order_id" = po."id"))
  AND (SELECT COALESCE(SUM(pi."value_pre_gst"::numeric + pi."gst_amount"::numeric), 0)
         FROM "project_purchase_invoices" pi
        WHERE pi."purchase_order_id" = po."id")
      >= COALESCE(po."amount_after_tds"::numeric,
                  (SELECT SUM(pop."total_amount"::numeric)
                     FROM "purchase_order_products" pop
                    WHERE pop."purchase_order_id" = po."id"));

UPDATE "vendor_work_orders" vw
SET "closed_at" = now()
WHERE vw."wo_approved" = true
  AND (SELECT COALESCE(SUM(pr."amount"::numeric), 0)
         FROM "project_payment_requests" pr
        WHERE pr."vendor_work_order_id" = vw."id" AND pr."status" = 'payment_done')
      >= COALESCE(vw."amount_after_tds"::numeric,
                  (SELECT SUM(vwi."total_amount"::numeric)
                     FROM "vendor_work_order_items" vwi
                    WHERE vwi."vendor_work_order_id" = vw."id"))
  AND (SELECT COALESCE(SUM(pi."value_pre_gst"::numeric + pi."gst_amount"::numeric), 0)
         FROM "project_purchase_invoices" pi
        WHERE pi."vendor_work_order_id" = vw."id")
      >= COALESCE(vw."amount_after_tds"::numeric,
                  (SELECT SUM(vwi."total_amount"::numeric)
                     FROM "vendor_work_order_items" vwi
                    WHERE vwi."vendor_work_order_id" = vw."id"));
