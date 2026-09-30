/**
 * Merge duplicate vendor_organizations rows that differ only by case or
 * whitespace, so the vendor-master dropdown stops showing two entries that
 * render identically.
 *
 * Usage (from the api/ directory; DATABASE_URL is loaded from api/.env):
 *   pnpm merge:vendor-duplicates              # dry run (SELECT only, no writes)
 *   pnpm merge:vendor-duplicates --apply      # archive + re-point + delete
 *   pnpm merge:vendor-duplicates --rollback   # undo the writes of the last --apply
 *
 * vendor_organizations_name_unique is a case-sensitive, space-sensitive UNIQUE
 * index, so both of these could coexist while lower(btrim(name)) collapsed them
 * into one dropdown entry:
 *   27 "Whirlpool Of India Limited"          78 "Whirlpool of India Limited"
 *   52 "...Limited " (trailing space)       127 "...Limited"
 *
 * For each pair --apply:
 *   1. copies the row being dropped into vendor_organizations_dups_archive
 *   2. fills any EMPTY identifying field on the keeper from the dropped row
 *      (never overwrites existing vendor-master data)
 *   3. re-points every id reference (org_id / *_organization_id) at the keeper,
 *      recording the moved primary keys in moved_refs
 *   4. verifies nothing still points at the dropped id, then deletes the row
 *
 * couriers.to_org is deliberately not touched: it stores free-text organisation
 * NAMES, not vendor_organizations.id (checked - zero rows match these companies).
 *
 * --rollback re-inserts the archived row, moves the recorded references back and
 * re-applies the recorded fills, so the merge is fully reversible.
 */
import "dotenv/config";
import { sql, type SQL } from "drizzle-orm";
import { createPool, createDb } from "../src/db";
import type { DbInstance } from "../src/db";

interface MergePair {
    keep: number;
    drop: number;
    why: string;
}

interface RefColumn {
    table: string;
    column: string;
}

interface OrgRow {
    id: number;
    name: string | null;
    alias: string | null;
    address: string | null;
    pan: string | null;
    msme: string | null;
    msme_type: string | null;
    status: boolean;
    created_at: string | Date;
    updated_at: string | Date;
}

interface ArchiveRow {
    id: number;
    kept_id: number;
    name: string | null;
    alias: string | null;
    address: string | null;
    pan: string | null;
    msme: string | null;
    msme_type: string | null;
    status: boolean | null;
    created_at: string | Date | null;
    updated_at: string | Date | null;
    reason: string | null;
    moved_refs: Record<string, number[]> | null;
    filled: Record<string, unknown> | null;
}

interface Executor {
    execute(query: SQL): Promise<unknown>;
}

const MERGES: MergePair[] = [
    { keep: 127, drop: 52, why: "same company; keeper holds PAN AACCD9731G, 14 GSTs and 1 PO" },
    { keep: 78, drop: 27, why: "same company; keeper holds PAN AAACW1336L, 26 GSTs and 2 POs" },
];

/** Id columns that point at vendor_organizations.id (no FK constraints exist). */
const REF_COLUMNS: RefColumn[] = [
    { table: "vendors", column: "org_id" },
    { table: "vendor_gsts", column: "org_id" },
    { table: "vendor_accs", column: "org_id" },
    { table: "vendor_files", column: "org_id" },
    { table: "projects", column: "org_id" },
    { table: "purchase_orders", column: "seller_organization_id" },
    { table: "vendor_work_orders", column: "seller_organization_id" },
    { table: "rfq_responses", column: "organization_id" },
    { table: "project_parties_sellers_archive", column: "resolved_org_id" },
    { table: "project_parties_sellers_archive", column: "vendor_organization_id" },
];

/** Copied from the dropped row only when the keeper's value is empty. */
const FILL_COLUMNS = ["alias", "pan", "msme", "msme_type", "address"] as const;

const failures: string[] = [];

const check = (label: string, ok: boolean, detail = "") => {
    if (!ok) failures.push(`${label}${detail ? ` — ${detail}` : ""}`);
    console.log(`${ok ? "PASS" : "FAIL"}  ${label}${detail ? `  (${detail})` : ""}`);
};

const ident = (name: string) => sql.raw(`"${name.replace(/"/g, '""')}"`);

async function rows<T>(db: Executor, query: SQL): Promise<T[]> {
    const result = (await db.execute(query)) as { rows: T[] };
    return result.rows;
}

async function readOrg(db: Executor, id: number): Promise<OrgRow | undefined> {
    const r = await rows<OrgRow>(
        db,
        sql`select id, name, alias, address, pan, msme, msme_type, status, created_at, updated_at
            from vendor_organizations where id = ${id}`
    );
    return r[0];
}

async function countRefs(db: Executor, ref: RefColumn, orgId: number): Promise<number> {
    const r = await rows<{ n: number }>(db, sql`select count(*)::int n from ${ident(ref.table)} where ${ident(ref.column)} = ${orgId}`);
    return Number(r[0]?.n ?? 0);
}

/** Primary keys currently pointing at orgId, captured before the UPDATE so the ids are exact. */
async function idsReferring(db: Executor, ref: RefColumn, orgId: number): Promise<number[]> {
    const r = await rows<{ id: number | string }>(db, sql`select ${ident("id")} from ${ident(ref.table)} where ${ident(ref.column)} = ${orgId}`);
    return r.map(x => Number(x.id));
}

const isEmpty = (v: unknown): boolean => v === null || v === undefined || (typeof v === "string" && v.trim() === "");

const quote = (v: unknown): string => (typeof v === "string" ? JSON.stringify(v) : String(v));

const dateOnly = (v: string | Date | null): string => (v ? String(v).slice(0, 10) : "-");

// ---------------------------------------------------------------- dry run ----

async function reportPair(db: Executor, pair: MergePair): Promise<{ keep?: OrgRow; drop?: OrgRow }> {
    const keep = await readOrg(db, pair.keep);
    const drop = await readOrg(db, pair.drop);

    if (!keep) {
        check(`keeper org ${pair.keep} exists`, false, "missing");
        return { drop };
    }
    if (!drop) {
        console.log(`SKIP  org ${pair.drop} is not present (already merged?)\n`);
        return { keep };
    }

    console.log(`MERGE  org ${pair.drop} -> org ${pair.keep}   (${pair.why})`);
    console.log(`  keep  #${keep.id} ${quote(keep.name)}  pan=${keep.pan || "-"}  created ${dateOnly(keep.created_at)}`);
    console.log(`  drop  #${drop.id} ${quote(drop.name)}  pan=${drop.pan || "-"}  created ${dateOnly(drop.created_at)}`);

    const refs: { ref: RefColumn; n: number }[] = [];
    for (const ref of REF_COLUMNS) {
        const n = await countRefs(db, ref, pair.drop);
        if (n > 0) refs.push({ ref, n });
    }
    if (refs.length === 0) {
        console.log("  refs   (nothing points at the dropped row)\n");
    } else {
        console.log("  refs   to re-point:");
        for (const { ref, n } of refs) console.log(`           ${ref.table}.${ref.column}  ${n} row(s)`);
        console.log("");
    }
    return { keep, drop };
}

// ---------------------------------------------------------------- apply ------

async function applyPair(db: DbInstance, pair: MergePair): Promise<void> {
    const keep = await readOrg(db, pair.keep);
    const drop = await readOrg(db, pair.drop);
    if (!keep || !drop) return;

    const moved: Record<string, number[]> = {};
    const filled: Record<string, unknown> = {};

    await db.transaction(async tx => {
        const txdb = tx as unknown as Executor;

        // 1. Capture what will change, before anything is written.
        for (const col of FILL_COLUMNS) {
            if (isEmpty(keep[col]) && !isEmpty(drop[col])) filled[col] = drop[col];
        }
        for (const ref of REF_COLUMNS) {
            const ids = await idsReferring(txdb, ref, pair.drop);
            if (ids.length > 0) moved[`${ref.table}.${ref.column}`] = ids;
        }

        // 2. Archive the row being dropped, with the plan attached.
        await tx.execute(sql`
            insert into vendor_organizations_dups_archive
                (id, kept_id, name, alias, address, pan, msme, msme_type, status,
                 created_at, updated_at, reason, moved_refs, filled)
            values (${drop.id}, ${keep.id}, ${drop.name}, ${drop.alias}, ${drop.address}, ${drop.pan},
                    ${drop.msme}, ${drop.msme_type}, ${drop.status}, ${drop.created_at}, ${drop.updated_at},
                    ${pair.why}, ${JSON.stringify(moved)}, ${JSON.stringify(filled)})
            on conflict (id) do update set kept_id = excluded.kept_id, reason = excluded.reason,
                moved_refs = excluded.moved_refs, filled = excluded.filled`);

        // 3. Fill only the keeper fields that are still empty.
        for (const col of Object.keys(filled)) {
            await tx.execute(sql`update vendor_organizations set ${ident(col)} = ${drop[col as keyof OrgRow]} where id = ${keep.id}`);
        }

        // 4. Re-point every reference at the keeper.
        for (const ref of REF_COLUMNS) {
            if (!moved[`${ref.table}.${ref.column}`]) continue;
            await tx.execute(
                sql`update ${ident(ref.table)} set ${ident(ref.column)} = ${keep.id}
                    where ${ident(ref.column)} = ${pair.drop}`
            );
        }

        // 5. Refuse to delete while anything still points at the dropped id.
        const orphans: string[] = [];
        for (const ref of REF_COLUMNS) {
            const n = await countRefs(txdb, ref, pair.drop);
            if (n > 0) orphans.push(`${ref.table}.${ref.column}=${n}`);
        }
        if (orphans.length > 0) {
            throw new Error(`org ${pair.drop} still referenced after move: ${orphans.join(", ")}`);
        }

        await tx.execute(sql`delete from vendor_organizations where id = ${pair.drop}`);
    });

    const movedSummary =
        Object.keys(moved).length === 0
            ? "(no references)"
            : Object.entries(moved)
                  .map(([k, ids]) => `${k}: ${ids.length} row(s) [${ids.join(", ")}]`)
                  .join("\n                 ");
    console.log(`  archived org ${pair.drop} -> vendor_organizations_dups_archive`);
    console.log(`  filled      ${Object.keys(filled).length === 0 ? "(keeper already complete)" : Object.keys(filled).join(", ")}`);
    console.log(`  moved       ${movedSummary}`);
    console.log(`  deleted     org ${pair.drop}\n`);
}

// ------------------------------------------------------------- rollback ------

async function rollback(db: DbInstance): Promise<void> {
    const archived = await rows<ArchiveRow>(db, sql`select * from vendor_organizations_dups_archive order by archived_at desc, id desc`);
    if (archived.length === 0) {
        console.log("Nothing in vendor_organizations_dups_archive - nothing to roll back.");
        return;
    }

    for (const rec of archived) {
        if (await readOrg(db, rec.id)) {
            console.log(`SKIP  org ${rec.id} already exists in vendor_organizations`);
            continue;
        }
        await db.transaction(async tx => {
            await tx.execute(sql`
                insert into vendor_organizations
                    (id, name, alias, address, pan, msme, msme_type, status, created_at, updated_at)
                values (${rec.id}, ${rec.name}, ${rec.alias}, ${rec.address}, ${rec.pan},
                        ${rec.msme}, ${rec.msme_type}, coalesce(${rec.status}, true),
                        ${rec.created_at}, ${rec.updated_at})`);

            const moved = rec.moved_refs ?? {};
            for (const [key, ids] of Object.entries(moved)) {
                const dot = key.lastIndexOf(".");
                const table = key.slice(0, dot);
                const column = key.slice(dot + 1);
                if (ids.length === 0) continue;
                await tx.execute(
                    sql`update ${ident(table)} set ${ident(column)} = ${rec.id}
                        where ${ident("id")} in (${sql.join(
                            ids.map(id => sql`${id}`),
                            sql`, `
                        )})`
                );
            }

            // Only undo a fill that nobody has edited since the merge.
            for (const [col, value] of Object.entries(rec.filled ?? {})) {
                await tx.execute(
                    sql`update vendor_organizations set ${ident(col)} = null
                        where id = ${rec.kept_id} and ${ident(col)} = ${String(value)}`
                );
            }

            await tx.execute(sql`delete from vendor_organizations_dups_archive where id = ${rec.id}`);
        });
        console.log(`  restored org ${rec.id} (was merged into ${rec.kept_id})`);
    }
}

// ----------------------------------------------------------------- main ------

const main = async (): Promise<number> => {
    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl) {
        console.error("DATABASE_URL not set - set it in the environment or api/.env.");
        return 1;
    }
    const apply = process.argv.includes("--apply");
    const rollbackMode = process.argv.includes("--rollback");
    const pool = createPool(dbUrl, 4, process.env.PGSSL === "true");
    const db = createDb(pool) as unknown as DbInstance;

    console.log(`\nvendor_organizations duplicate merge — ${rollbackMode ? "ROLLBACK" : apply ? "APPLY" : "DRY RUN"}\n`);

    if (rollbackMode) {
        await rollback(db);
    } else {
        for (const pair of MERGES) await reportPair(db, pair);

        if (apply) {
            console.log("Applying:\n");
            for (const pair of MERGES) await applyPair(db, pair);
        } else {
            console.log("Dry run only - re-run with --apply to write.");
        }

        const dupes = await rows<{ k: string; ids: number[] }>(
            db,
            sql`select lower(btrim(name)) k, array_agg(id order by id) ids
                from vendor_organizations
                where status and btrim(coalesce(name, '')) <> ''
                group by 1 having count(*) > 1
                order by 1`
        );
        console.log(`\nDuplicate name groups left in vendor_organizations: ${dupes.length}`);
        for (const d of dupes) console.log(`  ${d.k} -> ${d.ids.join(", ")}`);
        check("no duplicate vendor-master names remain", dupes.length === 0, `${dupes.length} group(s)`);
    }

    await pool.end();

    console.log(`\n${"=".repeat(70)}`);
    if (failures.length === 0) {
        console.log("ALL CHECKS PASSED");
        return 0;
    }
    console.log(`${failures.length} FAILURE(S):`);
    failures.forEach(f => console.log(`  - ${f}`));
    return 1;
};

main()
    .then(code => process.exit(code))
    .catch(err => {
        console.error(err);
        process.exit(1);
    });
