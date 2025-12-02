CREATE TABLE "permissions" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"module" varchar(100) NOT NULL,
	"action" varchar(50) NOT NULL,
	"description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "role_permissions" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"role_id" bigint NOT NULL,
	"permission_id" bigint NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_permissions" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"user_id" bigint NOT NULL,
	"permission_id" bigint NOT NULL,
	"granted" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_role_id_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_permission_id_permissions_id_fk" FOREIGN KEY ("permission_id") REFERENCES "public"."permissions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_permissions" ADD CONSTRAINT "user_permissions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_permissions" ADD CONSTRAINT "user_permissions_permission_id_permissions_id_fk" FOREIGN KEY ("permission_id") REFERENCES "public"."permissions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "permissions_module_action_idx" ON "permissions" USING btree ("module","action");--> statement-breakpoint
CREATE UNIQUE INDEX "role_permissions_unique_idx" ON "role_permissions" USING btree ("role_id","permission_id");--> statement-breakpoint
CREATE INDEX "role_permissions_role_idx" ON "role_permissions" USING btree ("role_id");--> statement-breakpoint
CREATE UNIQUE INDEX "user_permissions_unique_idx" ON "user_permissions" USING btree ("user_id","permission_id");--> statement-breakpoint
CREATE INDEX "user_permissions_user_idx" ON "user_permissions" USING btree ("user_id");
--> statement-breakpoint
INSERT INTO "permissions" ("module", "action", "description") VALUES
  -- Tenders
  ('tenders', 'create', 'Create new tenders'),
  ('tenders', 'read', 'View tenders'),
  ('tenders', 'update', 'Edit tenders'),
  ('tenders', 'delete', 'Delete tenders'),
  ('tenders', 'approve', 'Approve tenders'),

  -- EMDs
  ('emds', 'create', 'Create EMD entries'),
  ('emds', 'read', 'View EMD entries'),
  ('emds', 'update', 'Edit EMD entries'),
  ('emds', 'delete', 'Delete EMD entries'),

  -- RFQs
  ('rfqs', 'create', 'Create RFQs'),
  ('rfqs', 'read', 'View RFQs'),
  ('rfqs', 'update', 'Edit RFQs'),
  ('rfqs', 'delete', 'Delete RFQs'),

  -- Physical Docs
  ('physical-docs', 'create', 'Create physical docs'),
  ('physical-docs', 'read', 'View physical docs'),
  ('physical-docs', 'update', 'Edit physical docs'),
  ('physical-docs', 'delete', 'Delete physical docs'),

  -- Info Sheets
  ('info-sheets', 'create', 'Create info sheets'),
  ('info-sheets', 'read', 'View info sheets'),
  ('info-sheets', 'update', 'Edit info sheets'),
  ('info-sheets', 'delete', 'Delete info sheets'),

  -- Checklists
  ('checklists', 'create', 'Create checklists'),
  ('checklists', 'read', 'View checklists'),
  ('checklists', 'update', 'Edit checklists'),
  ('checklists', 'delete', 'Delete checklists'),

  -- Costing Sheets
  ('costing-sheets', 'create', 'Create costing sheets'),
  ('costing-sheets', 'read', 'View costing sheets'),
  ('costing-sheets', 'update', 'Edit costing sheets'),
  ('costing-sheets', 'delete', 'Delete costing sheets'),
  ('costing-sheets', 'approve', 'Approve costing sheets'),

  -- Operations
  ('operations', 'create', 'Create operations entries'),
  ('operations', 'read', 'View operations'),
  ('operations', 'update', 'Edit operations'),
  ('operations', 'delete', 'Delete operations'),

  -- Shared (Imprests, Follow-ups, Couriers)
  ('shared.imprests', 'create', 'Create imprests'),
  ('shared.imprests', 'read', 'View imprests'),
  ('shared.imprests', 'update', 'Edit imprests'),
  ('shared.imprests', 'delete', 'Delete imprests'),

  ('shared.followups', 'create', 'Create follow-ups'),
  ('shared.followups', 'read', 'View follow-ups'),
  ('shared.followups', 'update', 'Edit follow-ups'),
  ('shared.followups', 'delete', 'Delete follow-ups'),

  ('shared.couriers', 'create', 'Create couriers'),
  ('shared.couriers', 'read', 'View couriers'),
  ('shared.couriers', 'update', 'Edit couriers'),
  ('shared.couriers', 'delete', 'Delete couriers'),

  -- Accounts
  ('accounts', 'create', 'Create account entries'),
  ('accounts', 'read', 'View accounts'),
  ('accounts', 'update', 'Edit accounts'),
  ('accounts', 'delete', 'Delete accounts'),

  -- Master Data
  ('master.users', 'create', 'Create users'),
  ('master.users', 'read', 'View users'),
  ('master.users', 'update', 'Edit users'),
  ('master.users', 'delete', 'Delete users'),

  ('master.roles', 'create', 'Create roles'),
  ('master.roles', 'read', 'View roles'),
  ('master.roles', 'update', 'Edit roles'),
  ('master.roles', 'delete', 'Delete roles'),

  ('master.teams', 'create', 'Create teams'),
  ('master.teams', 'read', 'View teams'),
  ('master.teams', 'update', 'Edit teams'),
  ('master.teams', 'delete', 'Delete teams'),

  ('master', 'create', 'Create master data'),
  ('master', 'read', 'View master data'),
  ('master', 'update', 'Edit master data'),
  ('master', 'delete', 'Delete master data')
ON CONFLICT DO NOTHING; --> statement-breakpoint
