UPDATE "inventory_items"
SET "team_id" = CASE
	WHEN "team_id" = 5 THEN 1
	WHEN "team_id" = 3 THEN 2
	ELSE "team_id"
END
WHERE "team_id" IN (3, 5);
