ALTER TABLE "purchase_order_products" ADD COLUMN "unit" varchar(20);

UPDATE "purchase_order_products" SET "unit" = 'NOS' WHERE "unit" IS NULL OR "unit" = '';