-- 0134: Create project-wise inventory tables (inventory, inventory_movements, inventory_transfers)
-- Inventory is a virtual warehouse per project (warehouse name = project). One row per (project, item, hsn, price).
-- inventory_movements is the source-of-truth ledger for provenance/audit.
-- inventory_transfers records item transfers between projects (incl. VEPL HO).

CREATE TABLE IF NOT EXISTS "inventory" (
  "id" bigserial PRIMARY KEY,
  "project_id" bigint NOT NULL,
  "item_name" varchar(255) NOT NULL,
  "hsn" varchar(100),
  "price" numeric(20,2) NOT NULL,
  "qty" numeric(20,2) NOT NULL,
  "remaining_qty" numeric(20,2) NOT NULL,
  "line_item" integer,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "idx_inventory_project_id" ON "inventory" ("project_id");
CREATE UNIQUE INDEX IF NOT EXISTS "idx_inventory_project_item_hsn_price" ON "inventory" ("project_id", "item_name", COALESCE("hsn", ''), "price");

CREATE TABLE IF NOT EXISTS "inventory_movements" (
  "id" bigserial PRIMARY KEY,
  "inventory_id" bigint REFERENCES "inventory"("id") ON DELETE SET NULL,
  "project_id" bigint NOT NULL,
  "movement_type" varchar(50) NOT NULL,
  "reference_id" bigint,
  "from_project_id" bigint,
  "to_project_id" bigint,
  "po_id" bigint,
  "qty" numeric(20,2) NOT NULL,
  "price" numeric(20,2) NOT NULL,
  "item_name" varchar(255) NOT NULL,
  "hsn" varchar(100),
  "created_by" bigint,
  "created_at" timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "idx_im_project_id" ON "inventory_movements" ("project_id");
CREATE INDEX IF NOT EXISTS "idx_im_inventory_id" ON "inventory_movements" ("inventory_id");
CREATE INDEX IF NOT EXISTS "idx_im_movement_type" ON "inventory_movements" ("movement_type");

CREATE TABLE IF NOT EXISTS "inventory_transfers" (
  "id" bigserial PRIMARY KEY,
  "item_id" bigint NOT NULL,
  "from_project" bigint NOT NULL,
  "to_project" bigint NOT NULL,
  "qty" numeric(20,2) NOT NULL,
  "price" numeric(20,2) NOT NULL,
  "remark" text,
  "transferred_by" bigint,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "idx_it_from_project" ON "inventory_transfers" ("from_project");
CREATE INDEX IF NOT EXISTS "idx_it_to_project" ON "inventory_transfers" ("to_project");
CREATE INDEX IF NOT EXISTS "idx_it_item_id" ON "inventory_transfers" ("item_id");
