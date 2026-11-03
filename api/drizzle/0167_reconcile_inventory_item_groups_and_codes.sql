UPDATE "inventory_items"
SET "item_group" = CASE "item_name"
	WHEN 'Copper' THEN 'Raw Materials'
	WHEN 'PVC Pipe' THEN 'Raw Materials'
	WHEN 'UPVC Pipe' THEN 'Raw Materials'
	WHEN 'CPVC Pipe' THEN 'Raw Materials'
	WHEN 'Sleeve Insulation' THEN 'Raw Materials'
	WHEN 'Round Duct with Aluminium Foil' THEN 'Raw Materials'
	WHEN 'GI Duct / MS Duct' THEN 'Raw Materials'
	WHEN 'GI Sheet / MS Sheet' THEN 'Raw Materials'
	WHEN 'Nitrile Insulation Sheet / XLPE Insulation Sheet' THEN 'Raw Materials'
	WHEN 'Acoustic Insulation' THEN 'Raw Materials'
	WHEN 'Underdeck Insulation' THEN 'Raw Materials'
	WHEN 'Aluminium Perforated Sheet' THEN 'Raw Materials'
	WHEN 'Tissue Paper' THEN 'Raw Materials'
	WHEN 'Rubber Pad' THEN 'Raw Materials'
	WHEN 'AC Stand' THEN 'Finished Goods'
	WHEN 'Canvas' THEN 'Supplies'
	ELSE "item_group"
END
WHERE "item_group" IS NULL
   OR "item_name" IN (
		'Copper',
		'PVC Pipe',
		'UPVC Pipe',
		'CPVC Pipe',
		'Sleeve Insulation',
		'Round Duct with Aluminium Foil',
		'GI Duct / MS Duct',
		'GI Sheet / MS Sheet',
		'Nitrile Insulation Sheet / XLPE Insulation Sheet',
		'Acoustic Insulation',
		'Underdeck Insulation',
		'Aluminium Perforated Sheet',
		'Tissue Paper',
		'Rubber Pad',
		'AC Stand',
		'Canvas'
	);

SELECT setval(
	'inventory_item_code_seq',
	COALESCE(MAX((substring("item_code" FROM '^ITM-([0-9]+)$'))::bigint), 1),
	COUNT(*) FILTER (WHERE "item_code" ~ '^ITM-[0-9]+$') > 0
)
FROM "inventory_items";
