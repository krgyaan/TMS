-- Preserve the oldest active item in each duplicate group and soft-delete later copies.
WITH duplicates AS (
	SELECT "id", row_number() OVER (
		PARTITION BY "item_name", "unit", "item_type", "specifications"
		ORDER BY "id"
	) AS duplicate_number
	FROM "inventory_items"
	WHERE "deleted_at" IS NULL
)
UPDATE "inventory_items" AS item
SET "deleted_at" = now(), "is_active" = false, "updated_at" = now()
FROM duplicates
WHERE duplicates."id" = item."id"
	AND duplicates.duplicate_number > 1;

CREATE UNIQUE INDEX IF NOT EXISTS "inventory_items_active_null_type_business_key_unique"
	ON "inventory_items" ("item_name", "unit", "specifications")
	WHERE "deleted_at" IS NULL AND "item_type" IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "inventory_items_active_typed_business_key_unique"
	ON "inventory_items" ("item_name", "unit", "item_type", "specifications")
	WHERE "deleted_at" IS NULL AND "item_type" IS NOT NULL;
