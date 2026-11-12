INSERT INTO "role_permissions" ("role_id", "permission_id")
SELECT rp."role_id", target.id
FROM "role_permissions" rp
JOIN "permissions" old ON old.id = rp."permission_id"
JOIN "permissions" target ON target."module" = 'master.item-master' AND target."action" = old."action"
WHERE old."module" = 'accounts.inventory-items'
  AND old."action" IN ('create', 'update', 'delete')
ON CONFLICT ("role_id", "permission_id") DO NOTHING;
