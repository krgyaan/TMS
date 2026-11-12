ALTER TABLE "inventory_items"
	ADD COLUMN IF NOT EXISTS "team_id" bigint,
	ADD COLUMN IF NOT EXISTS "conversion_unit" varchar(80),
	ADD COLUMN IF NOT EXISTS "conversion_factor" numeric(20, 10);

ALTER TABLE "inventory_items"
	ALTER COLUMN "team_id" DROP NOT NULL;

DO $$
BEGIN
	IF NOT EXISTS (
		SELECT 1
		FROM pg_constraint
		WHERE conname = 'inventory_items_team_id_teams_id_fk'
		  AND conrelid = 'inventory_items'::regclass
	) THEN
		ALTER TABLE "inventory_items"
			ADD CONSTRAINT "inventory_items_team_id_teams_id_fk"
			FOREIGN KEY ("team_id") REFERENCES "teams"("id") NOT VALID;
	END IF;
END $$;

CREATE INDEX IF NOT EXISTS "inventory_items_team_id_idx"
	ON "inventory_items" ("team_id");
