INSERT INTO "permissions" ("module", "action", "description")
VALUES
	('master.item-master', 'read', 'View Settings Item Master'),
	('master.item-master', 'create', 'Create Settings Item Master records'),
	('master.item-master', 'update', 'Edit Settings Item Master records'),
	('master.item-master', 'delete', 'Delete Settings Item Master records')
ON CONFLICT ("module", "action") DO NOTHING;
