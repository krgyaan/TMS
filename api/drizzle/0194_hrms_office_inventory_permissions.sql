INSERT INTO "permissions" ("module", "action", "description")
VALUES
    ('hrms.office-inventory', 'read', 'View HRMS Office Inventory'),
    ('hrms.office-inventory', 'create', 'Create HRMS Office Inventory records'),
    ('hrms.office-inventory', 'update', 'Edit HRMS Office Inventory records'),
    ('hrms.office-inventory', 'delete', 'Delete HRMS Office Inventory records')
ON CONFLICT ("module", "action") DO NOTHING;
