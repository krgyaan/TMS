-- Add multi-phone support for WO contacts.
-- phones is the canonical array; phone remains a temporary mirror of phones[0].

ALTER TABLE "wo_contacts" ADD COLUMN IF NOT EXISTS "phones" jsonb NOT NULL DEFAULT '[]'::jsonb;

UPDATE "wo_contacts"
SET "phones" = jsonb_build_array("phone")
WHERE "phone" IS NOT NULL
  AND btrim("phone") <> ''
  AND ("phones" IS NULL OR "phones" = '[]'::jsonb);
