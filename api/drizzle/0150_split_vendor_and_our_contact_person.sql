-- One field triple, two different people.
--
-- `contact_person_*` on both purchase_orders and vendor_work_orders was written by
-- two independent frontend effects that raced each other with no precedence:
--
--   * selecting a seller autofilled it from vendors.name/email/mobile
--     (the vendor's contact person)
--   * "Quick Fill from Team Member" overwrote it from users.name/email/mobile
--     (our own employee)
--
-- Whichever was triggered last won, so the value depended on click order. Worse,
-- syncPersonForOrg wrote these columns straight back into the `vendors` table on
-- every create and update, so quick-filling an internal employee permanently
-- renamed the vendor's contact person in vendor master.
--
-- This splits the two. The existing columns keep meaning OUR side — which is what
-- the PDF template already called them (`oe_name` / `oe_number` / `oe_email`) —
-- and the vendor's person gets its own columns.

ALTER TABLE "purchase_orders" ADD COLUMN IF NOT EXISTS "vendor_contact_person_name" varchar(255);
ALTER TABLE "purchase_orders" ADD COLUMN IF NOT EXISTS "vendor_contact_person_phone" varchar(20);
ALTER TABLE "purchase_orders" ADD COLUMN IF NOT EXISTS "vendor_contact_person_email" varchar(255);

ALTER TABLE "vendor_work_orders" ADD COLUMN IF NOT EXISTS "vendor_contact_person_name" varchar(255);
ALTER TABLE "vendor_work_orders" ADD COLUMN IF NOT EXISTS "vendor_contact_person_phone" varchar(20);
ALTER TABLE "vendor_work_orders" ADD COLUMN IF NOT EXISTS "vendor_contact_person_email" varchar(255);

