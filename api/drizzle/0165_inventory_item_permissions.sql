INSERT INTO "permissions" ("module", "action", "description")
VALUES
	('accounts.inventory-items', 'read', 'View Accounts and Operations item master'),
	('accounts.inventory-items', 'create', 'Create item master records'),
	('accounts.inventory-items', 'update', 'Edit item master records'),
	('accounts.inventory-items', 'delete', 'Deactivate item master records')
ON CONFLICT ("module", "action") DO NOTHING;
