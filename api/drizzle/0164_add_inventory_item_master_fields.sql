ALTER TABLE "inventory_items"
	ADD COLUMN IF NOT EXISTS "item_code" varchar(30),
	ADD COLUMN IF NOT EXISTS "item_group" varchar(40),
	ADD COLUMN IF NOT EXISTS "description" varchar(500);

UPDATE "inventory_items"
SET
	"item_code" = COALESCE("item_code", 'ITM-' || LPAD("id"::text, 4, '0')),
	"item_group" = COALESCE("item_group", 'Raw Materials');

ALTER TABLE "inventory_items"
	ALTER COLUMN "item_code" SET NOT NULL,
	ALTER COLUMN "item_group" SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "inventory_items_item_code_unique" ON "inventory_items" ("item_code");
