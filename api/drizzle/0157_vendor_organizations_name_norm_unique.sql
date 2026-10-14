-- Prevent new case/whitespace duplicate vendor organizations.
--
-- `vendor_organizations_name_unique` is case- and edge-whitespace-sensitive, so
-- "Acme", "Acme " and "acme" coexisted. The PO/VWO "Add new seller" dialog and
-- the plain inserts in PurchaseOrderService/VendorWorkOrderService.createParty
-- created such rows, and PO creation then failed with a 23505 ("Duplicate vendor
-- org") when syncPartyFromPO wrote a colliding name back.
--
-- Application code now normalizes names and reuses an existing org, but this
-- functional partial index is the enforcement point. It is PARTIAL on
-- `status` to stay compatible with scripts/merge-vendor-orgs-runbook.md, which
-- deactivates (never deletes) duplicate orgs and leaves their old name in place.
--
-- Precondition: no ACTIVE duplicate normalized names may remain, or creating the
-- index fails. Run scripts/merge-vendor-orgs-runbook.md first. The DO block
-- below turns that failure into an actionable message.

DO $$
DECLARE
    dup_groups integer;
BEGIN
    SELECT count(*) INTO dup_groups
    FROM (
        SELECT lower(btrim(name)) AS k
        FROM vendor_organizations
        WHERE status AND btrim(coalesce(name, '')) <> ''
        GROUP BY 1
        HAVING count(*) > 1
    ) d;

    IF dup_groups > 0 THEN
        RAISE EXCEPTION 'Cannot create vendor_organizations_name_norm_unique: % active duplicate name group(s) remain. Merge them first, see scripts/merge-vendor-orgs-runbook.md.', dup_groups;
    END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS vendor_organizations_name_norm_unique
    ON vendor_organizations (lower(btrim(name)))
    WHERE status;
