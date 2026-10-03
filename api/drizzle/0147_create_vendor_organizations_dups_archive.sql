-- Duplicate vendor_organizations rows that differ only by case or trailing
-- whitespace (vendor_organizations_name_unique is case- and space-sensitive, so
-- both variants coexisted while the dropdown deduped on lower(btrim(name))).
--
-- scripts/merge-vendor-organization-duplicates.ts copies each dropped row here
-- after re-pointing its references at the richer organisation.
-- moved_refs records "<table>.<column>" -> [row ids that were re-pointed], which
-- is exactly what --rollback needs to put them back.

CREATE TABLE IF NOT EXISTS "vendor_organizations_dups_archive" (
	"id" bigint PRIMARY KEY,
	"kept_id" bigint NOT NULL,
	"name" varchar(255),
	"alias" varchar(255),
	"address" text,
	"pan" varchar(100),
	"msme" varchar(50),
	"msme_type" varchar(50),
	"status" boolean,
	"created_at" timestamp with time zone,
	"updated_at" timestamp with time zone,
	"reason" text,
	"moved_refs" jsonb,
	"filled" jsonb,
	"archived_at" timestamp with time zone DEFAULT now() NOT NULL
);
