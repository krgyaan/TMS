INSERT INTO "permissions" ("module", "action", "description")
SELECT module_name, action, description
FROM (
	VALUES
		('accounts.item-master', 'read', 'View Accounts item master'),
		('accounts.item-master', 'create', 'Create Accounts item master records'),
		('accounts.item-master', 'update', 'Edit Accounts item master records'),
		('accounts.item-master', 'delete', 'Deactivate Accounts item master records'),
		('operations.item-master', 'read', 'View Operations item master'),
		('operations.item-master', 'create', 'Create Operations item master records'),
		('operations.item-master', 'update', 'Edit Operations item master records'),
		('operations.item-master', 'delete', 'Deactivate Operations item master records')
) AS seeded(module_name, action, description)
ON CONFLICT ("module", "action") DO NOTHING;

INSERT INTO "role_permissions" ("role_id", "permission_id")
SELECT rp."role_id", target.id
FROM "role_permissions" rp
JOIN "permissions" old ON old.id = rp."permission_id"
JOIN "permissions" target ON target.action = old.action
WHERE old.module = 'accounts.inventory-items'
  AND target.module IN ('accounts.item-master', 'operations.item-master')
ON CONFLICT ("role_id", "permission_id") DO NOTHING;
