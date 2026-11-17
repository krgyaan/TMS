ALTER TABLE "inventory_items"
	ADD COLUMN IF NOT EXISTS "team_id" bigint,
	ADD COLUMN IF NOT EXISTS "conversion_unit" varchar(80),
	ADD COLUMN IF NOT EXISTS "conversion_factor" numeric(20, 10);

ALTER TABLE "inventory_items"
	ALTER COLUMN "conversion_factor" TYPE numeric(20, 10)
	USING NULLIF("conversion_factor"::text, '')::numeric;

UPDATE "inventory_items"
SET "team_id" = 5
WHERE "team_id" IS NULL;

ALTER TABLE "inventory_items"
	ALTER COLUMN "team_id" SET NOT NULL,
	ALTER COLUMN "item_group" DROP NOT NULL;

DO $$
BEGIN
	IF NOT EXISTS (
		SELECT 1 FROM pg_constraint WHERE conname = 'inventory_items_team_id_teams_id_fk'
	) THEN
		ALTER TABLE "inventory_items"
			ADD CONSTRAINT "inventory_items_team_id_teams_id_fk"
			FOREIGN KEY ("team_id") REFERENCES "teams"("id");
	END IF;
END $$;

CREATE INDEX IF NOT EXISTS "inventory_items_team_id_idx" ON "inventory_items" ("team_id");
