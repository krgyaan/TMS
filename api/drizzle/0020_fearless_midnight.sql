-- 1. Drop the default
ALTER TABLE "tender_infos"
ALTER COLUMN "delete_status" DROP DEFAULT;

ALTER TABLE "tender_infos"
ALTER COLUMN "tl_status" DROP DEFAULT;

-- 2. Convert enum to integer
ALTER TABLE "tender_infos"
ALTER COLUMN "delete_status" TYPE integer
USING "delete_status"::text::integer;

ALTER TABLE "tender_infos"
ALTER COLUMN "tl_status" TYPE integer
USING "tl_status"::text::integer;

-- 3. (Optional) Set a new default as integer
ALTER TABLE "tender_infos"
ALTER COLUMN "delete_status" SET DEFAULT 0;

ALTER TABLE "tender_infos"
ALTER COLUMN "tl_status" SET DEFAULT 0;

-- 4. Drop the enum types
DROP TYPE IF EXISTS "deleteStatus";
DROP TYPE IF EXISTS "tlStatus";
