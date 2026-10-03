-- project_parties is ship-to only from now on.
-- Sellers were migrated into vendor_organizations by
-- scripts/migrate-project-parties-sellers.ts (see project_parties_sellers_archive),
-- and PO/VWO reference them via seller_organization_id.

-- 1. Drop the never-populated link column back to vendor master.
ALTER TABLE "project_parties" DROP COLUMN IF EXISTS "vendor_organization_id";

-- 2. The old default was 'seller', which the constraint below rejects.
ALTER TABLE "project_parties" ALTER COLUMN "type" SET DEFAULT 'ship_to';

-- 3. Reject any future attempt to store a seller here.
DO $$ BEGIN
    ALTER TABLE "project_parties"
        ADD CONSTRAINT "project_parties_type_ship_to_check" CHECK ("type" = 'ship_to');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
