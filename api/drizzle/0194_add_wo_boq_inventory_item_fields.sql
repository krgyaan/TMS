-- Add optional inventory item linkage and HSN/SAC to WO BOQ rows.

ALTER TABLE "wo_billing_boq" ADD COLUMN IF NOT EXISTS "inventory_item_id" bigint;
ALTER TABLE "wo_billing_boq" ADD COLUMN IF NOT EXISTS "item_code" varchar(80);
ALTER TABLE "wo_billing_boq" ADD COLUMN IF NOT EXISTS "hsn_sac" varchar(100);

ALTER TABLE "wo_buyback_boq" ADD COLUMN IF NOT EXISTS "inventory_item_id" bigint;
ALTER TABLE "wo_buyback_boq" ADD COLUMN IF NOT EXISTS "item_code" varchar(80);
ALTER TABLE "wo_buyback_boq" ADD COLUMN IF NOT EXISTS "hsn_sac" varchar(100);

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'wo_billing_boq_inventory_item_id_inventory_items_id_fk'
    ) THEN
        ALTER TABLE "wo_billing_boq"
            ADD CONSTRAINT "wo_billing_boq_inventory_item_id_inventory_items_id_fk"
            FOREIGN KEY ("inventory_item_id") REFERENCES "inventory_items"("id")
            ON DELETE SET NULL;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'wo_buyback_boq_inventory_item_id_inventory_items_id_fk'
    ) THEN
        ALTER TABLE "wo_buyback_boq"
            ADD CONSTRAINT "wo_buyback_boq_inventory_item_id_inventory_items_id_fk"
            FOREIGN KEY ("inventory_item_id") REFERENCES "inventory_items"("id")
            ON DELETE SET NULL;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS "idx_billing_boq_inventory_item"
    ON "wo_billing_boq" ("inventory_item_id");

CREATE INDEX IF NOT EXISTS "idx_buyback_boq_inventory_item"
    ON "wo_buyback_boq" ("inventory_item_id");
