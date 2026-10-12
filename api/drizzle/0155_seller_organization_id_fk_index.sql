-- Harden the PO/VWO -> vendor organization link: every non-NULL
-- seller_organization_id must point at an existing vendor_organizations row,
-- and lookups on the column get an index.
--
-- Data backfill that makes this safe was run by:
--   scripts/merge-best-power-vendor-org.ts   (duplicate org #107 -> #20)
--   scripts/backfill-po-seller-org.ts        (8 links; 3 rows left NULL on purpose)
-- Pre-flight: 0 dangling references on both tables.

CREATE INDEX IF NOT EXISTS "idx_po_seller_organization_id"
    ON "purchase_orders" ("seller_organization_id");

CREATE INDEX IF NOT EXISTS "idx_vwo_seller_organization_id"
    ON "vendor_work_orders" ("seller_organization_id");

DO $$ BEGIN
    ALTER TABLE "purchase_orders"
        ADD CONSTRAINT "purchase_orders_seller_organization_id_fkey"
        FOREIGN KEY ("seller_organization_id") REFERENCES "vendor_organizations"("id")
        ON DELETE NO ACTION ON UPDATE NO ACTION;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE "vendor_work_orders"
        ADD CONSTRAINT "vendor_work_orders_seller_organization_id_fkey"
        FOREIGN KEY ("seller_organization_id") REFERENCES "vendor_organizations"("id")
        ON DELETE NO ACTION ON UPDATE NO ACTION;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
