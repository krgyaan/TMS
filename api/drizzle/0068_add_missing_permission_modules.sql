-- Add missing permission modules referenced by sidebar and controllers
INSERT INTO "permissions" ("module", "action", "description") VALUES
  -- Tendering sub-modules
  ('tender-approval', 'read', 'View tender approvals'),
  ('costing-approvals', 'read', 'View costing approvals'),
  ('bid-submissions', 'read', 'View bid submissions'),
  ('tq-management', 'read', 'View TQ management'),
  ('reverse-auction', 'read', 'View reverse auction'),
  ('tender-result', 'read', 'View tender results'),

  -- Operations (sidebar uses ops.* prefix)
  ('ops.work-order', 'read', 'View work orders'),
  ('ops.wo-approval', 'read', 'View WO approval'),
  ('ops.kick-off', 'read', 'View kick off meetings'),
  ('ops.contract-agreement', 'read', 'View contract agreements'),
  ('ops.dashboard', 'read', 'View operations project dashboard'),

  -- Services
  ('services.customers', 'read', 'View service customers'),
  ('services.conferences', 'read', 'View conferences'),
  ('services.visits', 'read', 'View visits'),
  ('services.amc', 'read', 'View AMC'),

  -- BI Dashboard sub-modules
  ('bi.bank-guarantee', 'read', 'View bank guarantee dashboard'),
  ('bi.demand-draft', 'read', 'View demand draft dashboard'),
  ('bi.bank-transfer', 'read', 'View bank transfer dashboard'),
  ('bi.pay-on-portal', 'read', 'View pay on portal dashboard'),
  ('bi.cheque', 'read', 'View cheque dashboard'),
  ('bi.fdr', 'read', 'View FDR dashboard'),

  -- Accounts sub-modules
  ('accounts.imprests', 'read', 'View accounts imprests'),
  ('accounts.loan-advances', 'read', 'View loan and advances'),
  ('accounts.checklists', 'read', 'View account checklists'),
  ('accounts.tds-checklists', 'read', 'View TDS checklists'),
  ('accounts.gst-checklists', 'read', 'View GST checklists'),
  ('accounts.fixed-expenses', 'read', 'View fixed expenses'),
  ('accounts.delegation', 'read', 'View delegation dashboard'),

  -- Document Dashboard
  ('document-dashboard.projects', 'read', 'View project documents'),
  ('document-dashboard.pqr', 'read', 'View PQR documents'),
  ('document-dashboard.finance-document', 'read', 'View finance documents'),

  -- CRM sub-modules
  ('crm.leads', 'read', 'View CRM leads'),
  ('crm.enquiries', 'read', 'View CRM enquiries'),
  ('crm.costings', 'read', 'View CRM costings'),
  ('crm.quotations', 'read', 'View CRM quotations'),

  -- Performance sub-modules
  ('performance.tender-executive', 'read', 'View tender executive performance'),
  ('performance.team-leader', 'read', 'View team leader performance'),
  ('performance.oem-dashboard', 'read', 'View OEM dashboard'),
  ('performance.business-dashboard', 'read', 'View business dashboard'),
  ('performance.customer-dashboard', 'read', 'View customer dashboard'),
  ('performance.location-dashboard', 'read', 'View location dashboard'),
  ('performance.operation-team', 'read', 'View operation team performance'),
  ('performance.account-team', 'read', 'View account team performance'),

  -- HRMS
  ('hrms.admin', 'read', 'View HRMS admin'),

  -- Master sub-modules
  ('master.permissions', 'read', 'View system permissions'),
  ('master.statuses', 'read', 'View statuses'),
  ('master.items', 'read', 'View items'),
  ('master.locations', 'read', 'View locations'),
  ('master.organizations', 'read', 'View organizations'),
  ('master.vendors', 'read', 'View vendors'),
  ('master.websites', 'read', 'View websites'),
  ('master.documents-submitted', 'read', 'View documents submitted'),
  ('master.imprest-categories', 'read', 'View imprest categories'),
  ('master.followup-categories', 'read', 'View followup categories'),
  ('master.emd-responsibilities', 'read', 'View EMD responsibilities'),
  ('master.lead-types', 'read', 'View lead types'),
  ('master.tq-types', 'read', 'View TQ types'),
  ('master.loan-parties', 'read', 'View loan parties'),

  -- Controller-level modules (needed by backend decorators)
  ('users', 'read', 'View users (controller-level)'),
  ('accounts.checklist-admin', 'read', 'View checklist admin'),
  ('performance.oem', 'read', 'View OEM performance'),
  ('performance.customer', 'read', 'View customer performance'),
  ('performance.business', 'read', 'View business performance'),
  ('performance.location', 'read', 'View location performance'),
  ('integrations', 'read', 'View integrations')
ON CONFLICT (module, action) DO NOTHING;
