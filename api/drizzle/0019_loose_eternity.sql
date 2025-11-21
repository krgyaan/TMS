DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'tlStatus') THEN
        CREATE TYPE "tlStatus" AS ENUM ('0', '1', '2', '3');
    END IF;
END$$;
--> statement-breakpoint

ALTER TABLE "tender_infos"
    ALTER COLUMN "tl_status" TYPE "tlStatus"
    USING "tl_status"::text::"tlStatus";
--> statement-breakpoint
