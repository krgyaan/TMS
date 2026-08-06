ALTER TABLE "amc" ADD COLUMN "allocated_te" bigint;--> statement-breakpoint
ALTER TABLE "amc_site_contacts" RENAME TO "amc_contacts";--> statement-breakpoint
ALTER TABLE "amc_contacts" ALTER COLUMN "amc_site_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "amc_contacts" ADD COLUMN "amc_id" bigint;--> statement-breakpoint
UPDATE "amc_contacts"
SET "amc_id" = "amc_sites"."amc_id"
FROM "amc_sites"
WHERE "amc_sites"."id" = "amc_contacts"."amc_site_id";--> statement-breakpoint
ALTER TABLE "amc_contacts" ALTER COLUMN "amc_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "amc_contacts" ADD COLUMN "source" varchar(50) DEFAULT 'site_contacts' NOT NULL;--> statement-breakpoint
INSERT INTO "amc_contacts" ("amc_id", "amc_site_id", "name", "organization", "mobile", "email", "source")
SELECT "amc_id", NULL, "name", "organization", "mobile", "email", 'service_engineer'
FROM "amc_service_engineers";--> statement-breakpoint
DROP INDEX IF EXISTS "amc_site_contacts_amc_site_id_foreign";--> statement-breakpoint
DROP TABLE IF EXISTS "amc_service_engineers";--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "amc_contacts_amc_id_foreign" ON "amc_contacts" USING btree ("amc_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "amc_contacts_amc_site_id_foreign" ON "amc_contacts" USING btree ("amc_site_id");--> statement-breakpoint
