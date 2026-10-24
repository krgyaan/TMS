-- Sale invoice snapshot fields for project-manager and buyer/consignee contact metadata.
--
-- These columns capture the values at invoice creation time so the generated PDF
-- remains stable even if the underlying project or contact records are edited later.
--
-- Apply with: psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f drizzle/0162_add_project_manager_and_snapshot_fields_to_sale_invoices.sql

ALTER TABLE "sale_invoices"
    ADD COLUMN IF NOT EXISTS "project_manager_name" varchar(255),
    ADD COLUMN IF NOT EXISTS "project_manager_phone" varchar(50),
    ADD COLUMN IF NOT EXISTS "project_manager_email" varchar(255),
    ADD COLUMN IF NOT EXISTS "billing_state_name" varchar(100),
    ADD COLUMN IF NOT EXISTS "billing_place_of_supply" varchar(100),
    ADD COLUMN IF NOT EXISTS "billing_contact_person" varchar(255),
    ADD COLUMN IF NOT EXISTS "billing_phone" varchar(50),
    ADD COLUMN IF NOT EXISTS "shipping_state_name" varchar(100),
    ADD COLUMN IF NOT EXISTS "shipping_place_of_supply" varchar(100),
    ADD COLUMN IF NOT EXISTS "shipping_contact_person" varchar(255),
    ADD COLUMN IF NOT EXISTS "shipping_phone" varchar(50),
    ADD COLUMN IF NOT EXISTS "transport_via" varchar(100);
