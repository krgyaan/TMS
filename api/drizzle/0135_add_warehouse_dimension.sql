-- 0135: Add warehouse dimension to inventory.
-- Each project gets two virtual warehouses: 'project_location' (named by project code, at project site)
-- and 'ho_sub' (named by project code, inside VEPL New Delhi HO). A central 'ho_main' warehouse holds
-- the HO's own stock (project 151). inventory.warehouse_id refines the (project, item, hsn, price) key.

CREATE TABLE IF NOT EXISTS "warehouses" (
  "id" bigserial PRIMARY KEY,
  "name" varchar(255) NOT NULL,
  "type" varchar(50) NOT NULL,
  "project_id" bigint,
  "parent_id" bigint,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "idx_warehouses_project_id" ON "warehouses" ("project_id");
CREATE INDEX IF NOT EXISTS "idx_warehouses_type" ON "warehouses" ("type");
CREATE INDEX IF NOT EXISTS "idx_warehouses_parent_id" ON "warehouses" ("parent_id");

ALTER TABLE "inventory" ADD COLUMN IF NOT EXISTS "warehouse_id" bigint;
CREATE INDEX IF NOT EXISTS "idx_inventory_warehouse_id" ON "inventory" ("warehouse_id");
DROP INDEX IF EXISTS "idx_inventory_project_item_hsn_price";
CREATE UNIQUE INDEX IF NOT EXISTS "idx_inventory_project_wh_item_hsn_price"
  ON "inventory" ("project_id", "warehouse_id", "item_name", COALESCE("hsn", ''), "price");

ALTER TABLE "inventory_movements"
  ADD COLUMN IF NOT EXISTS "warehouse_id" bigint,
  ADD COLUMN IF NOT EXISTS "from_warehouse_id" bigint,
  ADD COLUMN IF NOT EXISTS "to_warehouse_id" bigint;
CREATE INDEX IF NOT EXISTS "idx_im_warehouse_id" ON "inventory_movements" ("warehouse_id");
CREATE INDEX IF NOT EXISTS "idx_im_from_warehouse_id" ON "inventory_movements" ("from_warehouse_id");
CREATE INDEX IF NOT EXISTS "idx_im_to_warehouse_id" ON "inventory_movements" ("to_warehouse_id");

-- Central VEPL New Delhi HO warehouse (project 151 = "VEPL HO New Delhi").
INSERT INTO "warehouses" ("name", "type", "project_id")
SELECT 'VEPL New Delhi HO', 'ho_main', 151
WHERE NOT EXISTS (SELECT 1 FROM "warehouses" WHERE "type" = 'ho_main');