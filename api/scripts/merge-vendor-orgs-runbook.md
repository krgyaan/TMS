# Manual vendor organization merge runbook

Replaces the retired `scripts/merge-vendor-orgs.ts` tool. Everything here is
manual SQL against `vendor_organizations`.

**Rules**

- Merging **never deletes** a `vendor_organizations` row. The duplicate is
  deactivated (`status = false`) after its references are re-pointed.
- Every merge runs in **one transaction** and aborts if any reference to the
  dropped id remains.
- Archive every drop into `vendor_organizations_dups_archive` (drizzle/0147)
  with `moved_refs` + `filled`, so the merge can be reversed by hand.

---

## 1. Detect duplicates (read-only)

```sql
-- 1a. duplicate normalized names (case/space variants)
SELECT lower(btrim(name)) AS k, array_agg(id ORDER BY id) AS ids, count(*)
FROM vendor_organizations
WHERE status AND btrim(coalesce(name, '')) <> ''
GROUP BY 1 HAVING count(*) > 1
ORDER BY 2;

-- 1b. same PAN under different names (or same name)
SELECT pan, array_agg(id ORDER BY id) AS ids,
       string_agg(DISTINCT name, ' | ')
FROM vendor_organizations
WHERE status AND btrim(coalesce(pan, '')) <> ''
GROUP BY lower(btrim(pan))
HAVING count(DISTINCT lower(btrim(name))) > 1
ORDER BY 1;

-- 1c. one GSTIN shared by differently-named orgs (POLLUTION - usually a
--     mis-attached GST row, NOT a merge candidate; fix vendor_gsts instead)
SELECT g.gst_no, array_agg(DISTINCT g.org_id) AS org_ids,
       string_agg(DISTINCT o.name, ' | ')
FROM vendor_gsts g JOIN vendor_organizations o ON o.id = g.org_id
WHERE o.status AND length(regexp_replace(g.gst_no, '[^A-Z0-9]', '', 'g')) = 15
GROUP BY g.gst_no
HAVING count(DISTINCT lower(btrim(o.name))) > 1
ORDER BY 2;
```

## 2. Choose the keeper

Priority: **PAN present > most GSTs > most PO/VWO/contact/bank/file refs >
oldest `created_at`**. Evidence query:

```sql
SELECT o.id, o.name, o.pan, o.status, o.created_at::date,
  (SELECT count(*) FROM vendor_gsts g  WHERE g.org_id = o.id) AS gsts,
  (SELECT count(*) FROM vendors v      WHERE v.org_id = o.id) AS contacts,
  (SELECT count(*) FROM purchase_orders p   WHERE p.seller_organization_id = o.id) AS po,
  (SELECT count(*) FROM vendor_work_orders w WHERE w.seller_organization_id = o.id) AS vwo
FROM vendor_organizations o
WHERE o.id IN (:keep, :drop1, :drop2 /* ... */)
ORDER BY o.id;
```

## 3. Merge one duplicate (one transaction per drop)

Run once per drop id. Set the two variables at the top of the psql session:

```sql
\set keep 98
\set drop 245

BEGIN;

-- 3a. archive the drop + record what will move / what will be filled
WITH d AS (SELECT * FROM vendor_organizations WHERE id = :drop),
     k AS (SELECT * FROM vendor_organizations WHERE id = :keep),
     plan AS (
       SELECT
         jsonb_build_object(
           'vendors.org_id',                        (SELECT coalesce(json_agg(id),'[]') FROM vendors        WHERE org_id = d.id),
           'vendor_gsts.org_id',                    (SELECT coalesce(json_agg(id),'[]') FROM vendor_gsts    WHERE org_id = d.id),
           'vendor_accs.org_id',                    (SELECT coalesce(json_agg(id),'[]') FROM vendor_accs    WHERE org_id = d.id),
           'vendor_files.org_id',                   (SELECT coalesce(json_agg(id),'[]') FROM vendor_files   WHERE org_id = d.id),
           'projects.org_id',                       (SELECT coalesce(json_agg(id),'[]') FROM projects       WHERE org_id = d.id),
           'purchase_orders.seller_organization_id',(SELECT coalesce(json_agg(id),'[]') FROM purchase_orders WHERE seller_organization_id = d.id),
           'vendor_work_orders.seller_organization_id',(SELECT coalesce(json_agg(id),'[]') FROM vendor_work_orders WHERE seller_organization_id = d.id),
           'rfq_responses.organization_id',         (SELECT coalesce(json_agg(id),'[]') FROM rfq_responses  WHERE organization_id = d.id),
           'project_parties_sellers_archive.resolved_org_id',       (SELECT coalesce(json_agg(id),'[]') FROM project_parties_sellers_archive WHERE resolved_org_id = d.id),
           'project_parties_sellers_archive.vendor_organization_id',(SELECT coalesce(json_agg(id),'[]') FROM project_parties_sellers_archive WHERE vendor_organization_id = d.id)
         ) AS moved_refs,
         jsonb_strip_nulls(jsonb_build_object(
           'alias',     CASE WHEN k.alias     IS NULL OR btrim(k.alias)     = '' THEN d.alias     END,
           'pan',       CASE WHEN k.pan       IS NULL OR btrim(k.pan)       = '' THEN d.pan       END,
           'msme',      CASE WHEN k.msme      IS NULL OR btrim(k.msme)      = '' THEN d.msme      END,
           'msme_type', CASE WHEN k.msme_type IS NULL OR btrim(k.msme_type) = '' THEN d.msme_type END,
           'address',   CASE WHEN k.address   IS NULL OR btrim(k.address)   = '' THEN d.address   END
         )) AS filled
       FROM d, k
     )
INSERT INTO vendor_organizations_dups_archive
  (id, kept_id, name, alias, address, pan, msme, msme_type, status,
   created_at, updated_at, reason, moved_refs, filled)
SELECT d.id, k.id, d.name, d.alias, d.address, d.pan, d.msme, d.msme_type,
       d.status, d.created_at, d.updated_at, 'manual merge (see runbook §3)',
       p.moved_refs, p.filled
FROM d, k, plan p
ON CONFLICT (id) DO UPDATE
  SET kept_id = EXCLUDED.kept_id, reason = EXCLUDED.reason,
      moved_refs = EXCLUDED.moved_refs, filled = EXCLUDED.filled;

-- 3b. fill the keeper's EMPTY identifying fields from the drop
UPDATE vendor_organizations k
SET alias     = CASE WHEN k.alias     IS NULL OR btrim(k.alias)     = '' THEN d.alias     ELSE k.alias END,
    pan       = CASE WHEN k.pan       IS NULL OR btrim(k.pan)       = '' THEN d.pan       ELSE k.pan END,
    msme      = CASE WHEN k.msme      IS NULL OR btrim(k.msme)      = '' THEN d.msme      ELSE k.msme END,
    msme_type = CASE WHEN k.msme_type IS NULL OR btrim(k.msme_type) = '' THEN d.msme_type ELSE k.msme_type END,
    address   = CASE WHEN k.address   IS NULL OR btrim(k.address)   = '' THEN d.address   ELSE k.address END
FROM vendor_organizations d
WHERE k.id = :keep AND d.id = :drop;

-- 3c. re-point every reference drop -> keep (10 columns)
UPDATE vendors                             SET org_id = :keep    WHERE org_id = :drop;
UPDATE vendor_gsts                         SET org_id = :keep    WHERE org_id = :drop;
UPDATE vendor_accs                         SET org_id = :keep    WHERE org_id = :drop;
UPDATE vendor_files                        SET org_id = :keep    WHERE org_id = :drop;
UPDATE projects                            SET org_id = :keep    WHERE org_id = :drop;
UPDATE purchase_orders                     SET seller_organization_id = :keep WHERE seller_organization_id = :drop;
UPDATE vendor_work_orders                  SET seller_organization_id = :keep WHERE seller_organization_id = :drop;
UPDATE rfq_responses                      SET organization_id = :keep WHERE organization_id = :drop;
UPDATE project_parties_sellers_archive     SET resolved_org_id = :keep       WHERE resolved_org_id = :drop;
UPDATE project_parties_sellers_archive     SET vendor_organization_id = :keep WHERE vendor_organization_id = :drop;

-- 3d. must return 0 - if not, run ROLLBACK; do not continue
SELECT (
      (SELECT count(*) FROM vendors             WHERE org_id = :drop)
    + (SELECT count(*) FROM vendor_gsts         WHERE org_id = :drop)
    + (SELECT count(*) FROM vendor_accs         WHERE org_id = :drop)
    + (SELECT count(*) FROM vendor_files        WHERE org_id = :drop)
    + (SELECT count(*) FROM projects            WHERE org_id = :drop)
    + (SELECT count(*) FROM purchase_orders     WHERE seller_organization_id = :drop)
    + (SELECT count(*) FROM vendor_work_orders  WHERE seller_organization_id = :drop)
    + (SELECT count(*) FROM rfq_responses       WHERE organization_id = :drop)
    + (SELECT count(*) FROM project_parties_sellers_archive
         WHERE resolved_org_id = :drop OR vendor_organization_id = :drop)
) AS remaining_refs;

-- 3e. deactivate the duplicate - NEVER delete it
UPDATE vendor_organizations SET status = false WHERE id = :drop;

COMMIT;
```

## 4. Verify

```sql
-- no dangling references anywhere (expect 0, 0)
SELECT
 (SELECT count(*) FROM purchase_orders p
   WHERE p.seller_organization_id IS NOT NULL
     AND NOT EXISTS (SELECT 1 FROM vendor_organizations o WHERE o.id = p.seller_organization_id)),
 (SELECT count(*) FROM vendor_work_orders w
   WHERE w.seller_organization_id IS NOT NULL
     AND NOT EXISTS (SELECT 1 FROM vendor_organizations o WHERE o.id = w.seller_organization_id));

-- no duplicate ACTIVE normalized names (expect 0 rows)
SELECT lower(btrim(name)) k, array_agg(id ORDER BY id)
FROM vendor_organizations
WHERE status AND btrim(coalesce(name, '')) <> ''
GROUP BY 1 HAVING count(*) > 1;

-- everything that was merged, with evidence
SELECT * FROM vendor_organizations_dups_archive ORDER BY archived_at DESC;
```

**Rollback of a merge** (reverse of §3): re-point `moved_refs` back
(`<table>.<column>` → row ids are stored as jsonb), null out the keeper's
`filled` columns where they still equal the archived value, restore
`status` from the archive, delete the archive row.

## 5. Pending groups (live server, as of last dry-run)

| Group | keep | drop(s) | evidence |
|---|---|---|---|
| Voltas | #23 | #256 | keep has 29 GSTs vs 1; drop's 1 PO re-points to #23 |
| Delta Electronics | #122 | #52 | keep has PAN + 14 GSTs; drop has neither |
| RS Trader | #251 | #204 | same PAN; keep has GST + 1 VWO |
| Asys Insta Power | #98 | #245 | same PAN AAPCA3857R; drop has 1 contact/GST/VWO |
| P.S Engineers | #184 | #281 | same PAN BMZPK0289D; drop has 1 contact/GST/VWO |
| Power Build / Ned Energy | #71 | #179 | same PAN AAACP8227F + shared GSTs |
| Haier Appliances | #58 | #29 | same PAN AABCH3162L; keep has 26 GSTs |
| LG Electronics (3-way) | #38 | #59, #264 | one PAN AAACL1745Q; #59 has 27 GSTs, #264 has 1 project + 1 PO |
| Whirlpool Of India | #27 | #73 | case-dup names; drop has 26 GSTs. **Daikin #75 excluded** (mis-attached GST row - fix `vendor_gsts` instead) |

Do one transaction per drop. After all merges, run §4.

## 6. Remaining seller-org work (separate from merging)

- Backfill NULL sellers: `pnpm backfill:po-seller-org` (review overrides → `--apply`)
- FK + index migration (applied on dev, **not yet on live**):
  `psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f drizzle/0155_seller_organization_id_fk_index.sql`
  (run the §4 dangling check first - both counts must be 0)
