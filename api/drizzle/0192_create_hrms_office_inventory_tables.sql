-- HRMS Office Inventory Management tables

CREATE TABLE IF NOT EXISTS "hrms_office_inventory_items" (
  "id" bigserial PRIMARY KEY NOT NULL,
  "category" varchar(50) NOT NULL,
  "item_code" varchar(50) NOT NULL UNIQUE,
  "item_name" varchar(255) NOT NULL,
  "unit" varchar(50) NOT NULL,
  "min_stock_level" numeric(12, 2) NOT NULL DEFAULT 0,
  "opening_stock" numeric(12, 2) NOT NULL DEFAULT 0,
  "created_by" bigint,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_hrms_oi_items_category" ON "hrms_office_inventory_items" ("category");

CREATE TABLE IF NOT EXISTS "hrms_office_inventory_purchases" (
  "id" bigserial PRIMARY KEY NOT NULL,
  "purchase_date" date NOT NULL,
  "item_id" bigint NOT NULL REFERENCES "hrms_office_inventory_items"("id") ON DELETE RESTRICT,
  "qty_purchased" numeric(12, 2) NOT NULL,
  "rate" numeric(12, 2) NOT NULL DEFAULT 0,
  "amount" numeric(14, 2) NOT NULL DEFAULT 0,
  "supplier" varchar(255),
  "notes" text,
  "created_by" bigint,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_hrms_oi_purchases_item_id" ON "hrms_office_inventory_purchases" ("item_id");
CREATE INDEX IF NOT EXISTS "idx_hrms_oi_purchases_date" ON "hrms_office_inventory_purchases" ("purchase_date");

CREATE TABLE IF NOT EXISTS "hrms_office_inventory_consumptions" (
  "id" bigserial PRIMARY KEY NOT NULL,
  "consumption_date" date NOT NULL,
  "item_id" bigint NOT NULL REFERENCES "hrms_office_inventory_items"("id") ON DELETE RESTRICT,
  "qty_issued" numeric(12, 2) NOT NULL,
  "issued_to" varchar(255),
  "notes" text,
  "created_by" bigint,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_hrms_oi_consumptions_item_id" ON "hrms_office_inventory_consumptions" ("item_id");
CREATE INDEX IF NOT EXISTS "idx_hrms_oi_consumptions_date" ON "hrms_office_inventory_consumptions" ("consumption_date");

CREATE TABLE IF NOT EXISTS "hrms_office_equipment" (
  "id" bigserial PRIMARY KEY NOT NULL,
  "category" varchar(50) NOT NULL,
  "equipment_code" varchar(50) NOT NULL UNIQUE,
  "item_name" varchar(255) NOT NULL,
  "unit" varchar(50) NOT NULL,
  "location" varchar(255),
  "opening_qty" numeric(12, 2) NOT NULL DEFAULT 0,
  "unit_cost" numeric(12, 2) NOT NULL DEFAULT 0,
  "condition" varchar(50) NOT NULL DEFAULT 'Good',
  "remarks" text,
  "created_by" bigint,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_hrms_oi_equipment_category" ON "hrms_office_equipment" ("category");

CREATE TABLE IF NOT EXISTS "hrms_office_equipment_logs" (
  "id" bigserial PRIMARY KEY NOT NULL,
  "log_date" date NOT NULL,
  "equipment_id" bigint NOT NULL REFERENCES "hrms_office_equipment"("id") ON DELETE RESTRICT,
  "movement_type" varchar(80) NOT NULL,
  "qty" numeric(12, 2) NOT NULL,
  "cost" numeric(12, 2),
  "reason_notes" text,
  "approved_by" varchar(255),
  "created_by" bigint,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_hrms_oi_eq_logs_equipment_id" ON "hrms_office_equipment_logs" ("equipment_id");
CREATE INDEX IF NOT EXISTS "idx_hrms_oi_eq_logs_date" ON "hrms_office_equipment_logs" ("log_date");

CREATE TABLE IF NOT EXISTS "hrms_office_appliances" (
  "id" bigserial PRIMARY KEY NOT NULL,
  "appliance_code" varchar(50) NOT NULL UNIQUE,
  "appliance_name" varchar(255) NOT NULL,
  "brand_model" varchar(255),
  "location" varchar(255),
  "purchase_date" date,
  "purchase_cost" numeric(12, 2),
  "warranty_expiry" date,
  "service_frequency" varchar(50) NOT NULL DEFAULT 'As Needed',
  "cleaning_frequency" varchar(50) NOT NULL DEFAULT 'Weekly',
  "status" varchar(50) NOT NULL DEFAULT 'In Service',
  "discard_date" date,
  "notes" text,
  "created_by" bigint,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "hrms_office_appliance_services" (
  "id" bigserial PRIMARY KEY NOT NULL,
  "service_date" date NOT NULL,
  "appliance_id" bigint NOT NULL REFERENCES "hrms_office_appliances"("id") ON DELETE RESTRICT,
  "visit_type" varchar(80) NOT NULL,
  "vendor_technician" varchar(255),
  "expense" numeric(12, 2) NOT NULL DEFAULT 0,
  "next_service_due" date,
  "notes" text,
  "created_by" bigint,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_hrms_oi_app_services_appliance_id" ON "hrms_office_appliance_services" ("appliance_id");
CREATE INDEX IF NOT EXISTS "idx_hrms_oi_app_services_date" ON "hrms_office_appliance_services" ("service_date");

CREATE TABLE IF NOT EXISTS "hrms_office_appliance_cleanings" (
  "id" bigserial PRIMARY KEY NOT NULL,
  "cleaning_date" date NOT NULL,
  "appliance_id" bigint NOT NULL REFERENCES "hrms_office_appliances"("id") ON DELETE RESTRICT,
  "cleaning_type" varchar(80) NOT NULL,
  "done_by" varchar(255),
  "cost" numeric(12, 2) DEFAULT 0,
  "notes" text,
  "created_by" bigint,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_hrms_oi_app_cleanings_appliance_id" ON "hrms_office_appliance_cleanings" ("appliance_id");
CREATE INDEX IF NOT EXISTS "idx_hrms_oi_app_cleanings_date" ON "hrms_office_appliance_cleanings" ("cleaning_date");
