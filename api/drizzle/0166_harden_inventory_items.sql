ALTER TABLE "inventory_items"
	ADD COLUMN IF NOT EXISTS "deleted_at" timestamp with time zone;

CREATE SEQUENCE IF NOT EXISTS "inventory_item_code_seq";

SELECT setval(
	'inventory_item_code_seq',
	COALESCE(MAX("id"), 1),
	COUNT(*) > 0
)
FROM "inventory_items";
