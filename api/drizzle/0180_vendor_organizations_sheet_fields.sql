-- Vendor master sheet v2: map the extra columns from tms_sheet.xlsx.
--
-- `vendor_organizations.address` is used for the sheet's "Unregistered Address"
-- column (UNREGISTERED vendors), so no separate address column is added.
--
-- `alias` is removed from vendor_organizations. project_parties.alias and the
-- historical vendor_organizations_dups_archive.alias column are intentionally
-- left in place.

ALTER TABLE vendor_organizations ADD COLUMN IF NOT EXISTS category varchar(50);
ALTER TABLE vendor_organizations ADD COLUMN IF NOT EXISTS msme_size varchar(10);
ALTER TABLE vendor_organizations ADD COLUMN IF NOT EXISTS registration_type varchar(20);
ALTER TABLE vendor_organizations ADD COLUMN IF NOT EXISTS credit_period_days integer;
ALTER TABLE vendor_organizations ADD COLUMN IF NOT EXISTS credit_amount numeric(14, 2);
ALTER TABLE vendor_organizations ADD COLUMN IF NOT EXISTS major_activity varchar(50);

-- Preserve existing alias values before the column is dropped. This table can
-- be dropped once the migration has been verified in production.
CREATE TABLE IF NOT EXISTS vendor_organizations_alias_backup (
    id bigint PRIMARY KEY,
    name varchar(255),
    alias varchar(255),
    backed_up_at timestamp with time zone NOT NULL DEFAULT now()
);

INSERT INTO vendor_organizations_alias_backup (id, name, alias)
SELECT id, name, alias
FROM vendor_organizations
WHERE alias IS NOT NULL AND btrim(alias) <> ''
ON CONFLICT (id) DO NOTHING;

ALTER TABLE vendor_organizations DROP COLUMN IF EXISTS alias;
