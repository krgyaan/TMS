-- Forward migration for deployments that applied/shared 0179; removes only the unused subcategory field.
DROP INDEX IF EXISTS "inventory_items_subcategory_idx";
ALTER TABLE "inventory_items" DROP COLUMN IF EXISTS "subcategory";
