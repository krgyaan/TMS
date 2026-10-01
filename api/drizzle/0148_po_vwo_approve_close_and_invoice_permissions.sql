-- Permission fixes for Vendor Master CRUD, PO/VWO approval and closure, and the
-- purchase-invoices module that closure screens already reference.
--
-- Three defects this corrects:
--
--   1. `master.vendors` only ever had `read` (0068). The vendor-master UI gates
--      create/update/delete against it, so Add/Edit/Delete Vendor, GST, bank
--      account, file and person were hidden from every non-Admin user.
--
--   2. No `approve` action existed for PO or VWO. Both have approval flows
--      (po_approved / wo_approved) but neither was permissioned, so any user who
--      could reach a list could approve. Likewise no `close` action existed.
--
--   3. `accounts.purchase-invoices` was referenced by PoClosurePage.tsx and
--      VwoClosurePage.tsx but never inserted into `permissions`, so
--      <CanUpdate module="accounts.purchase-invoices"> was permanently false for
--      every non-Admin. Only Super User / Admin could create purchase invoices
--      from either closure screen.
--
-- Vendor Master is collapsed onto `master.vendors`: `accounts.vendor-master` is
-- retired here so the sidebar, the route gate and the page constants all read one
-- module string. Deploy this together with the app-sidebar.tsx change.

-- ---------------------------------------------------------------------------
-- 1. Vendor Master CRUD
-- ---------------------------------------------------------------------------

INSERT INTO "permissions" ("module", "action", "description")
VALUES
  ('master.vendors', 'create', 'Create vendors'),
  ('master.vendors', 'update', 'Update vendors'),
  ('master.vendors', 'delete', 'Delete vendors')
ON CONFLICT (module, action) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 2. PO / VWO approval and closure, as distinct actions on the existing modules
-- ---------------------------------------------------------------------------

INSERT INTO "permissions" ("module", "action", "description")
VALUES
  ('accounts.purchase-orders',    'approve', 'Approve accounts purchase orders'),
  ('accounts.purchase-orders',    'close',   'Close accounts purchase orders'),
  ('accounts.vendor-work-orders', 'approve', 'Approve accounts vendor work orders'),
  ('accounts.vendor-work-orders', 'close',   'Close accounts vendor work orders'),
  ('ops.purchase-orders',         'approve', 'Approve operations purchase orders'),
  ('ops.purchase-orders',         'close',   'Close operations purchase orders'),
  ('ops.vendor-work-orders',      'approve', 'Approve operations vendor work orders'),
  ('ops.vendor-work-orders',      'close',   'Close operations vendor work orders')
ON CONFLICT (module, action) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 3. Purchase invoices — already referenced by the closure screens, never seeded
-- ---------------------------------------------------------------------------

INSERT INTO "permissions" ("module", "action", "description")
SELECT m.module, a.action,
  CASE a.action
    WHEN 'create' THEN 'Create '  || m.module
    WHEN 'read'   THEN 'Read '    || m.module
    WHEN 'update' THEN 'Update '  || m.module
    WHEN 'delete' THEN 'Delete '  || m.module
  END
FROM (VALUES ('accounts.purchase-invoices'), ('ops.purchase-invoices')) AS m(module)
CROSS JOIN (VALUES ('create'), ('read'), ('update'), ('delete')) AS a(action)
WHERE NOT EXISTS (
  SELECT 1 FROM "permissions" p WHERE p.module = m.module AND p.action = a.action
);

-- ---------------------------------------------------------------------------
-- 4. Grants — carry today's access forward, lock nobody out on day one
-- ---------------------------------------------------------------------------

-- 4a. accounts.vendor-master -> master.vendors, same actions. This also carries
--     `read` over, which those four users did not have on master.vendors, so
--     collapsing the module does not leave them with buttons they cannot press.
INSERT INTO "user_permissions" ("user_id", "permission_id", "granted")
SELECT up."user_id", tgt."id", true
FROM "user_permissions" up
JOIN "permissions" src ON src."id" = up."permission_id"
JOIN "permissions" tgt ON tgt."module" = 'master.vendors' AND tgt."action" = src."action"
WHERE src."module" = 'accounts.vendor-master' AND up."granted" = true
ON CONFLICT (user_id, permission_id) DO NOTHING;

-- 4b. Approval is ungated today, so every read-holder of a list can currently
--     approve it. Mirror read -> approve, then approve -> close, so the existing
--     approvers keep both the approve and the close capability they have now.
INSERT INTO "user_permissions" ("user_id", "permission_id", "granted")
SELECT up."user_id", tgt."id", true
FROM "user_permissions" up
JOIN "permissions" src ON src."id" = up."permission_id"
JOIN "permissions" tgt ON tgt."module" = src."module" AND tgt."action" = 'approve'
WHERE src."action" = 'read'
  AND src."module" IN ('accounts.purchase-orders', 'accounts.vendor-work-orders',
                       'ops.purchase-orders', 'ops.vendor-work-orders')
  AND up."granted" = true
ON CONFLICT (user_id, permission_id) DO NOTHING;

INSERT INTO "user_permissions" ("user_id", "permission_id", "granted")
SELECT up."user_id", tgt."id", true
FROM "user_permissions" up
JOIN "permissions" src ON src."id" = up."permission_id"
JOIN "permissions" tgt ON tgt."module" = src."module" AND tgt."action" = 'close'
WHERE src."action" = 'approve'
  AND src."module" IN ('accounts.purchase-orders', 'accounts.vendor-work-orders',
                       'ops.purchase-orders', 'ops.vendor-work-orders')
  AND up."granted" = true
ON CONFLICT (user_id, permission_id) DO NOTHING;

-- 4c. Everyone who can manage payment requests can manage purchase invoices on
--     the same closure screens, so mirror those grants too.
INSERT INTO "user_permissions" ("user_id", "permission_id", "granted")
SELECT up."user_id", tgt."id", true
FROM "user_permissions" up
JOIN "permissions" src ON src."id" = up."permission_id"
JOIN "permissions" tgt ON tgt."action" = src."action"
  AND tgt."module" IN ('accounts.purchase-invoices', 'ops.purchase-invoices')
WHERE src."module" = 'accounts.payment-requests'
  AND up."granted" = true
ON CONFLICT (user_id, permission_id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 5. Retire accounts.vendor-master (now unreferenced by sidebar + page constants)
-- ---------------------------------------------------------------------------

DELETE FROM "user_permissions"
WHERE "permission_id" IN (SELECT "id" FROM "permissions" WHERE "module" = 'accounts.vendor-master');

DELETE FROM "permissions" WHERE "module" = 'accounts.vendor-master';
