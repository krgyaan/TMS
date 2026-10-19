-- Shared read-only vendor directory under Document Dashboard.
--
-- Until now the RFQ form's vendor dropdown (GET /vendor-organizations/with-relations)
-- required `master.vendors:read`, which also unlocked the whole Settings > Vendors
-- (and Accounts > Vendor Master / Parties) CRUD area. This migration splits the two
-- concerns:
--
--   1. New module `document-dashboard.vendors` with `read` (view the shared,
--      read-only directory) and `create` (upload vendor files from it).
--      Both actions are granted to every role so the page is available to all users.
--
--   2. `master.vendors` grants are removed from role_permissions and
--      user_permissions, so only Admin / Super User (built-in bypass in
--      PermissionService) reach Settings > Vendors. The permissions rows
--      themselves stay so the Permissions UI and admins can re-grant later.
--
-- Deploy together with the vendor-master.controller.ts RequireAnyPermission
-- change, or read endpoints will 403 for non-Admin users (incl. the RFQ vendor
-- dropdown).
--
-- Apply with: psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f drizzle/0159_shared_vendor_directory_permissions.sql

-- ---------------------------------------------------------------------------
-- 1. New permission module
-- ---------------------------------------------------------------------------

INSERT INTO "permissions" ("module", "action", "description")
VALUES
  ('document-dashboard.vendors', 'read',   'View shared vendor directory (read-only)'),
  ('document-dashboard.vendors', 'create', 'Upload vendor files from the shared directory')
ON CONFLICT (module, action) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 2. Grant both actions to every role — the directory is for all users
-- ---------------------------------------------------------------------------

INSERT INTO "role_permissions" ("role_id", "permission_id")
SELECT r."id", p."id"
FROM "roles" r
CROSS JOIN "permissions" p
WHERE p."module" = 'document-dashboard.vendors'
ON CONFLICT DO NOTHING;

-- ---------------------------------------------------------------------------
-- 3. Revoke master.vendors from roles and user overrides.
--    Admin / Super User keep access via the built-in bypass.
--    User rows are deleted outright (not granted=false) so a future re-grant to
--    a role is not blocked by a stale deny override.
-- ---------------------------------------------------------------------------

DELETE FROM "role_permissions"
WHERE "permission_id" IN (SELECT "id" FROM "permissions" WHERE "module" = 'master.vendors');

DELETE FROM "user_permissions"
WHERE "permission_id" IN (SELECT "id" FROM "permissions" WHERE "module" = 'master.vendors');
