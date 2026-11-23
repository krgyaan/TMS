-- Grant Stage 2 PO & VWO approval permissions to Accounts team approvers:
--   - Kailash Kumar (id: 33, kailash@volksenergie.in)
--   - Sunil         (id: 42, sunilsain459@gmail.com)
--   - Imran Khan    (id: 62, imran.khan@volksenergie.in)
--
-- Idempotent across local, staging, and production databases.

-- 1. Ensure required permissions exist
INSERT INTO "permissions" ("module", "action", "description")
VALUES
  ('accounts',                    'read',    'Read accounts module'),
  ('accounts.purchase-orders',    'read',    'Read accounts purchase orders'),
  ('accounts.purchase-orders',    'approve', 'Approve accounts purchase orders'),
  ('accounts.purchase-orders',    'close',   'Close accounts purchase orders'),
  ('accounts.vendor-work-orders', 'read',    'Read accounts vendor work orders'),
  ('accounts.vendor-work-orders', 'approve', 'Approve accounts vendor work orders'),
  ('accounts.vendor-work-orders', 'close',   'Close accounts vendor work orders')
ON CONFLICT (module, action) DO NOTHING;

-- 2. Grant Stage 2 PO/VWO approval permissions to Sunil, Kailash, and Imran
INSERT INTO "user_permissions" ("user_id", "permission_id", "granted")
SELECT u."id", p."id", true
FROM "users" u
CROSS JOIN "permissions" p
WHERE (
    LOWER(u."email") IN (
      'kailash@volksenergie.in',
      'sunilsain459@gmail.com',
      'imran.khan@volksenergie.in'
    )
    OR u."id" IN (33, 42, 62)
  )
  AND (
    (p."module" = 'accounts' AND p."action" = 'read')
    OR (p."module" IN ('accounts.purchase-orders', 'accounts.vendor-work-orders')
        AND p."action" IN ('read', 'approve', 'close'))
  )
ON CONFLICT (user_id, permission_id)
DO UPDATE SET "granted" = true;
