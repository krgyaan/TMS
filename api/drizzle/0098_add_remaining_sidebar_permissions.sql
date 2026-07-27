-- Migration: Add remaining sidebar menu permissions
-- These modules are referenced by the app sidebar but were missing from the DB

INSERT INTO "permissions" ("module", "action", "description") VALUES
  -- Operations (missing ops.* modules)
  ('ops.purchase-orders', 'create', 'Create ops purchase orders'),
  ('ops.purchase-orders', 'read', 'View ops purchase orders'),
  ('ops.purchase-orders', 'update', 'Update ops purchase orders'),
  ('ops.purchase-orders', 'delete', 'Delete ops purchase orders'),

  ('ops.vendor-work-orders', 'create', 'Create vendor work orders'),
  ('ops.vendor-work-orders', 'read', 'View vendor work orders'),
  ('ops.vendor-work-orders', 'update', 'Update vendor work orders'),
  ('ops.vendor-work-orders', 'delete', 'Delete vendor work orders'),

  ('ops.sale-invoices', 'create', 'Create ops sale invoices'),
  ('ops.sale-invoices', 'read', 'View ops sale invoices'),
  ('ops.sale-invoices', 'update', 'Update ops sale invoices'),
  ('ops.sale-invoices', 'delete', 'Delete ops sale invoices'),

  ('ops.payment-requests', 'create', 'Create ops payment requests'),
  ('ops.payment-requests', 'read', 'View ops payment requests'),
  ('ops.payment-requests', 'update', 'Update ops payment requests'),
  ('ops.payment-requests', 'delete', 'Delete ops payment requests'),

  -- BI Dashboard
  ('bi.tender-fee', 'create', 'Create tender fee dashboard entries'),
  ('bi.tender-fee', 'read', 'View tender fee dashboard'),
  ('bi.tender-fee', 'update', 'Update tender fee dashboard entries'),
  ('bi.tender-fee', 'delete', 'Delete tender fee dashboard entries'),

  -- Accounts (missing accounts.* modules)
  ('accounts.purchase-orders', 'create', 'Create accounts purchase orders'),
  ('accounts.purchase-orders', 'read', 'View accounts purchase orders'),
  ('accounts.purchase-orders', 'update', 'Update accounts purchase orders'),
  ('accounts.purchase-orders', 'delete', 'Delete accounts purchase orders'),

  ('accounts.sale-invoices', 'create', 'Create accounts sale invoices'),
  ('accounts.sale-invoices', 'read', 'View accounts sale invoices'),
  ('accounts.sale-invoices', 'update', 'Update accounts sale invoices'),
  ('accounts.sale-invoices', 'delete', 'Delete accounts sale invoices'),

  ('accounts.payment-requests', 'create', 'Create accounts payment requests'),
  ('accounts.payment-requests', 'read', 'View accounts payment requests'),
  ('accounts.payment-requests', 'update', 'Update accounts payment requests'),
  ('accounts.payment-requests', 'delete', 'Delete accounts payment requests'),

  -- Document Dashboard
  ('shared.client-directory', 'create', 'Create client directory entries'),
  ('shared.client-directory', 'read', 'View client directory'),
  ('shared.client-directory', 'update', 'Update client directory entries'),
  ('shared.client-directory', 'delete', 'Delete client directory entries'),

  -- Settings
  ('master.circulars', 'create', 'Create circulars'),
  ('master.circulars', 'read', 'View circulars'),
  ('master.circulars', 'update', 'Update circulars'),
  ('master.circulars', 'delete', 'Delete circulars')
ON CONFLICT (module, action) DO NOTHING;
