-- Idempotent, additive Item Master catalog update; production prerequisite before deploying the API.
ALTER TABLE "inventory_items"
    ADD COLUMN IF NOT EXISTS "subcategory" varchar(120),
    ADD COLUMN IF NOT EXISTS "model_number" varchar(120);

CREATE INDEX IF NOT EXISTS "inventory_items_subcategory_idx"
    ON "inventory_items" ("subcategory");
