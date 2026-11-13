-- Idempotent migration. Production prerequisite: apply before deploying the Item Master API.
ALTER TABLE "inventory_items"
    ADD COLUMN IF NOT EXISTS "category" varchar(80),
    ADD COLUMN IF NOT EXISTS "make_brand" varchar(120),
    ADD COLUMN IF NOT EXISTS "created_by" bigint,
    ADD COLUMN IF NOT EXISTS "updated_by" bigint;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_attribute
         WHERE attrelid = 'inventory_items'::regclass
           AND attname = 'item_group'
           AND attnotnull
           AND NOT attisdropped
    ) THEN
        ALTER TABLE "inventory_items" ALTER COLUMN "item_group" DROP NOT NULL;
    END IF;
    IF EXISTS (
        SELECT 1 FROM pg_attribute
         WHERE attrelid = 'inventory_items'::regclass
           AND attname = 'team_id'
           AND attnotnull
           AND NOT attisdropped
    ) THEN
        ALTER TABLE "inventory_items" ALTER COLUMN "team_id" DROP NOT NULL;
    END IF;
END $$;

DO $$
DECLARE
    current_length integer;
BEGIN
    SELECT character_maximum_length INTO current_length
      FROM information_schema.columns
     WHERE table_schema = current_schema()
       AND table_name = 'inventory_items'
       AND column_name = 'item_code';
    IF current_length IS NOT NULL AND current_length < 80 THEN
        ALTER TABLE "inventory_items" ALTER COLUMN "item_code" TYPE varchar(80);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
         WHERE conname = 'inventory_items_created_by_users_id_fk'
           AND conrelid = 'inventory_items'::regclass
    ) THEN
        ALTER TABLE "inventory_items"
            ADD CONSTRAINT "inventory_items_created_by_users_id_fk"
            FOREIGN KEY ("created_by") REFERENCES "users" ("id") ON DELETE SET NULL;
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
         WHERE conname = 'inventory_items_updated_by_users_id_fk'
           AND conrelid = 'inventory_items'::regclass
    ) THEN
        ALTER TABLE "inventory_items"
            ADD CONSTRAINT "inventory_items_updated_by_users_id_fk"
            FOREIGN KEY ("updated_by") REFERENCES "users" ("id") ON DELETE SET NULL;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS "inventory_items_category_idx"
    ON "inventory_items" ("category");
CREATE INDEX IF NOT EXISTS "inventory_items_created_by_idx"
    ON "inventory_items" ("created_by");
