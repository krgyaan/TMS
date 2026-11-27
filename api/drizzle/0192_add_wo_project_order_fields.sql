-- Add project classification and PO receipt fields to Basic Details and Projects.

ALTER TABLE "wo_basic_details" ADD COLUMN IF NOT EXISTS "order_nature" varchar(20);
ALTER TABLE "wo_basic_details" ADD COLUMN IF NOT EXISTS "po_received_status" varchar(20);
ALTER TABLE "wo_basic_details" ADD COLUMN IF NOT EXISTS "sap_po_upload" jsonb;

ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "order_nature" varchar(20);
ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "po_received_status" varchar(20);
ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "sap_po_upload" jsonb;
