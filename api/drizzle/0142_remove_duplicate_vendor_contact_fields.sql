-- Remove duplicate contact fields from vendors (contactPerson ≈ name, mobileNumber ≈ mobile).
ALTER TABLE "vendors" DROP COLUMN IF EXISTS "contact_person";
ALTER TABLE "vendors" DROP COLUMN IF EXISTS "mobile_number";
