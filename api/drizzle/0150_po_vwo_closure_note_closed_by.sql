-- Closure records who closed a PO/VWO and why. Until now `closePurchaseOrder` /
-- `closeVendorWorkOrder` only wrote `closed_at`, so the audit trail answers
-- "when" but never "who" or "why" — and a closure could be triggered with a
-- single click and no recorded decision.
--
--   * `closed_by` is the user id from the JWT (same bare bigint convention as
--     `po_raised_by` / `wo_raised_by`); left nullable because rows closed before
--     this migration have no known actor.
--   * `closure_note` is the mandatory explanation collected by the confirmation
--     dialog on the closure pages; left nullable for the same backfill reason.

ALTER TABLE "purchase_orders" ADD COLUMN IF NOT EXISTS "closed_by" bigint;
ALTER TABLE "purchase_orders" ADD COLUMN IF NOT EXISTS "closure_note" text;

ALTER TABLE "vendor_work_orders" ADD COLUMN IF NOT EXISTS "closed_by" bigint;
ALTER TABLE "vendor_work_orders" ADD COLUMN IF NOT EXISTS "closure_note" text;
