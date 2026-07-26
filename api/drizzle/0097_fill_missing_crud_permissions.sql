-- Migration: Fill missing CRUD permissions for all existing modules
-- Adds create, read, update, delete for any module missing them

INSERT INTO permissions (module, action, description)
SELECT m.module, a.action,
  CASE a.action
    WHEN 'create' THEN 'Create ' || m.module
    WHEN 'read'   THEN 'Read '   || m.module
    WHEN 'update' THEN 'Update ' || m.module
    WHEN 'delete' THEN 'Delete ' || m.module
  END
FROM (SELECT DISTINCT module FROM permissions) m
CROSS JOIN (VALUES ('create'), ('read'), ('update'), ('delete')) AS a(action)
WHERE NOT EXISTS (
  SELECT 1 FROM permissions p
  WHERE p.module = m.module AND p.action = a.action
);
