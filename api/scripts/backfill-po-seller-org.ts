/**
 * Link purchase_orders / vendor_work_orders rows that still have a NULL
 * seller_organization_id to the correct vendor_organizations row.
 *
 * Id-agnostic: nothing here is hard-coded to one database. It scans the
 * CONNECTED database for unresolved documents, matches them by natural keys,
 * and routes every ambiguous case through a human-reviewed overrides file -
 * so the same tool runs safely on dev, live, or a restore, and can be
 * re-run any time new rows appear.
 *
 * Workflow:
 *   1. pnpm backfill:po-seller-org
 *        finds every PO/VWO with NULL seller_organization_id, tries to match
 *        each by unique normalized name -> PAN recovered from GSTIN -> unique
 *        GST, and writes scripts/po-seller-org-overrides.json for anything
 *        that needs a human decision:
 *          { "po:2": { "action": "skip",   "reason": "...", "needsReview": true } }
 *          { "po:5": { "action": "link",   "orgId": 20,     "needsReview": true } }
 *          { "po:86":{ "action": "create", "reason": "...", "needsReview": true } }
 *        Unique auto-matches are pre-filled as action=link, needsReview=false.
 *   2. Review the JSON. Four actions are understood:
 *          link    set orgId to an existing vendor_organizations.id
 *          create  build a new vendor org from the document's own seller
 *                  fields (or supply an explicit "org": {...} object)
 *          skip    leave the document NULL on purpose
 *          (action values other than these are rejected)
 *      Set needsReview to false once decided. --apply refuses to run while
 *      any override for a still-NULL document needsReview.
 *   3. pnpm backfill:po-seller-org --apply
 *
 * Safety:
 *   - only ever writes rows whose seller_organization_id IS NULL (never
 *     overwrites an existing link)
 *   - verifies zero dangling references after applying
 *   - idempotent: re-runs skip everything already linked
 *   - logs every write to migration-logs/
 */
import "dotenv/config";
import * as fs from "fs";
import * as path from "path";
import { sql, eq } from "drizzle-orm";
import { createPool, createDb } from "../src/db";
import { MigrationLogger } from "./migrationLogger";
import { purchaseOrders } from "../src/db/schemas/operations/purchase-orders.schema";
import { vendorWorkOrders } from "../src/db/schemas/operations/vendor-work-orders.schema";
import { vendorOrganizations, vendors, vendorGsts } from "../src/db/schemas/vendors";

type DocTable = "purchase_orders" | "vendor_work_orders";

interface DocRow {
    id: number;
    docNumber: string | null;
    sellerName: string | null;
    sellerPanNo: string | null;
    sellerGstNo: string | null;
    sellerAddress: string | null;
    sellerEmail: string | null;
}

interface OrgSpec {
    name: string;
    pan?: string | null;
    address?: string | null;
    gstNo?: string | null;
    contactEmail?: string | null;
}

type OverrideAction = "link" | "create" | "skip";

interface Override {
    action: OverrideAction;
    orgId?: number;
    org?: OrgSpec;
    reason?: string;
    needsReview: boolean;
}

interface PlanEntry {
    key: string;
    table: DocTable;
    docId: number;
    doc: DocRow;
    /** unique natural-key match, when one exists */
    matchedOrgId?: number;
    matchWhy: string;
    override: Override;
}

const FLAGS = new Set(process.argv.slice(2));
const APPLY = FLAGS.has("--apply");
const ALLOW_UNREVIEWED = FLAGS.has("--allow-unreviewed");
const OVERRIDE_PATH = path.join(__dirname, "po-seller-org-overrides.json");

const say = (line: string): void => {
    console.log(line);
};

// ------------------------------------------------------------ normalizers ---

const normName = (v: string | null): string => (v ?? "").replace(/\s+/g, " ").trim().toLowerCase();
const trimOrNull = (v: string | null | undefined): string | null => {
    const t = (v ?? "").trim();
    return t === "" ? null : t;
};
const normGst = (v: string | null): string => (v ?? "").toUpperCase().replace(/[^A-Z0-9]/g, "");

/** PAN can be recovered from a GSTIN when the PAN column itself is blank. */
function panKeyOf(doc: DocRow): string | null {
    const own = trimOrNull(doc.sellerPanNo);
    if (own) return own.toLowerCase();
    const gst = normGst(doc.sellerGstNo);
    if (gst.length >= 12) return gst.slice(2, 12).toLowerCase();
    return null;
}

/**
 * Resolve a document by name, then PAN, then GST.
 * Only a *unique* identifier hit counts - a PAN shared by two orgs resolves nothing.
 */
function matchDoc(doc: DocRow, byName: Map<string, number[]>, byPan: Map<string, number[]>, byGst: Map<string, number[]>): { orgId?: number; why: string } {
    const nameHits = byName.get(normName(doc.sellerName)) ?? [];
    if (normName(doc.sellerName) && nameHits.length === 1) return { orgId: nameHits[0], why: "unique name match" };

    const panKey = panKeyOf(doc);
    if (panKey) {
        const hits = byPan.get(panKey) ?? [];
        if (hits.length === 1) return { orgId: hits[0], why: `unique PAN match (${panKey})` };
        if (hits.length > 1) return { why: `PAN ${panKey} shared by orgs ${hits.join(", ")} - decide manually` };
    }

    const gstKey = normGst(doc.sellerGstNo);
    if (gstKey.length >= 10) {
        const hits = byGst.get(gstKey) ?? [];
        if (hits.length === 1) return { orgId: hits[0], why: `unique GST match (${gstKey})` };
        if (hits.length > 1) return { why: `GST ${gstKey} shared by orgs ${hits.join(", ")} - decide manually` };
    }

    if (nameHits.length > 1) return { why: `name matches orgs ${nameHits.join(", ")} - decide manually` };
    return { why: "no name, PAN or GST match" };
}

// --------------------------------------------------------------- overrides ---

function loadOverrides(): Map<string, Override> {
    const map = new Map<string, Override>();
    if (!fs.existsSync(OVERRIDE_PATH)) return map;
    const raw = JSON.parse(fs.readFileSync(OVERRIDE_PATH, "utf8")) as Record<string, Override>;
    for (const [k, v] of Object.entries(raw)) map.set(k, v);
    return map;
}

function writeOverrides(entries: PlanEntry[]): void {
    const out: Record<string, Override> = {};
    for (const e of entries) out[e.key] = e.override;
    fs.writeFileSync(OVERRIDE_PATH, JSON.stringify(out, null, 4) + "\n");
}

// ------------------------------------------------------------------- main ---

async function readNullDocs(db: ReturnType<typeof createDb>): Promise<{ table: DocTable; docs: DocRow[] }[]> {
    const pos = await db
        .select({
            id: purchaseOrders.id,
            docNumber: purchaseOrders.poNumber,
            sellerName: purchaseOrders.sellerName,
            sellerPanNo: purchaseOrders.sellerPanNo,
            sellerGstNo: purchaseOrders.sellerGstNo,
            sellerAddress: purchaseOrders.sellerAddress,
            sellerEmail: purchaseOrders.sellerEmail,
        })
        .from(purchaseOrders)
        .where(sql`${purchaseOrders.sellerOrganizationId} IS NULL`)
        .orderBy(purchaseOrders.id);
    const vwos = await db
        .select({
            id: vendorWorkOrders.id,
            docNumber: vendorWorkOrders.woNumber,
            sellerName: vendorWorkOrders.sellerName,
            sellerPanNo: vendorWorkOrders.sellerPanNo,
            sellerGstNo: vendorWorkOrders.sellerGstNo,
            sellerAddress: vendorWorkOrders.sellerAddress,
            sellerEmail: vendorWorkOrders.sellerEmail,
        })
        .from(vendorWorkOrders)
        .where(sql`${vendorWorkOrders.sellerOrganizationId} IS NULL`)
        .orderBy(vendorWorkOrders.id);
    return [
        { table: "purchase_orders", docs: pos },
        { table: "vendor_work_orders", docs: vwos },
    ];
}

async function orgExists(db: ReturnType<typeof createDb>, orgId: number): Promise<string | null> {
    const [row] = await db.select({ name: vendorOrganizations.name }).from(vendorOrganizations).where(eq(vendorOrganizations.id, orgId));
    return row?.name ?? null;
}

function updateStmt(table: DocTable, docId: number, orgId: number) {
    return table === "purchase_orders"
        ? sql`UPDATE purchase_orders SET seller_organization_id = ${orgId}, updated_at = now()
              WHERE id = ${docId} AND seller_organization_id IS NULL`
        : sql`UPDATE vendor_work_orders SET seller_organization_id = ${orgId}, updated_at = now()
              WHERE id = ${docId} AND seller_organization_id IS NULL`;
}

async function main(): Promise<void> {
    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl) {
        console.error("DATABASE_URL not set - set it in the environment or api/.env.");
        process.exit(1);
    }

    const logger = new MigrationLogger("./migration-logs", APPLY ? "po-seller-org" : "po-seller-org-dryrun");
    logger.log(`Mode: ${APPLY ? "apply" : "dry run (SELECT only)"}`);
    say(`Mode: ${APPLY ? "APPLY" : "DRY RUN"}`);

    const pool = createPool(dbUrl, 2, process.env.PGSSL === "true");
    const db = createDb(pool);

    try {
        // ---- indexes over every vendor org --------------------------------
        const [orgs, gsts] = await Promise.all([
            db.select({ id: vendorOrganizations.id, name: vendorOrganizations.name, pan: vendorOrganizations.pan }).from(vendorOrganizations),
            db.select({ orgId: vendorGsts.orgId, gstNo: vendorGsts.gstNo }).from(vendorGsts),
        ]);
        const byName = new Map<string, number[]>();
        const byPan = new Map<string, number[]>();
        const byGst = new Map<string, number[]>();
        const push = (map: Map<string, number[]>, key: string, id: number): void => {
            const list = map.get(key);
            if (list) list.push(id);
            else map.set(key, [id]);
        };
        for (const o of orgs) {
            const nk = normName(o.name);
            if (nk) push(byName, nk, o.id);
            const pk = trimOrNull(o.pan);
            if (pk) push(byPan, pk.toLowerCase(), o.id);
        }
        for (const g of gsts) {
            const gk = normGst(g.gstNo);
            if (gk.length >= 10 && g.orgId) push(byGst, gk, g.orgId);
        }

        // ---- scan unresolved documents ------------------------------------
        const groups = await readNullDocs(db);
        const entries: PlanEntry[] = [];
        for (const { table, docs } of groups) {
            for (const doc of docs) {
                const key = `${table === "purchase_orders" ? "po" : "vwo"}:${doc.id}`;
                const { orgId, why } = matchDoc(doc, byName, byPan, byGst);
                entries.push({ key, table, docId: doc.id, doc, matchedOrgId: orgId, matchWhy: why, override: { action: "skip", reason: why, needsReview: true } });
            }
        }

        // ---- merge in overrides / pre-fill safe auto-matches ---------------
        const overrides = loadOverrides();
        for (const e of entries) {
            const prior = overrides.get(e.key);
            if (prior) {
                e.override = { ...prior, needsReview: prior.needsReview !== false };
                continue;
            }
            if (e.matchedOrgId !== undefined) {
                e.override = { action: "link", orgId: e.matchedOrgId, reason: e.matchWhy, needsReview: false };
            }
        }

        // ---- report --------------------------------------------------------
        say(
            `\nUnresolved documents: ${entries.length} (POs ${entries.filter(e => e.table === "purchase_orders").length}, VWOs ${entries.filter(e => e.table === "vendor_work_orders").length})`
        );
        let linkedReady = 0;
        let skips = 0;
        let creates = 0;
        for (const e of entries) {
            const tag = e.override.needsReview ? "REVIEW" : e.override.action.toUpperCase().padEnd(6);
            const target =
                e.override.action === "link" && e.override.orgId !== undefined
                    ? ` -> org #${e.override.orgId}${(await orgExists(db, e.override.orgId)) ? "" : "  !! missing"}`
                    : e.override.action === "create"
                      ? " -> NEW org"
                      : "";
            say(`  ${tag}  ${e.key}  "${e.doc.sellerName ?? "(unnamed)"}"${target}`);
            say(`         match: ${e.matchWhy}${e.override.reason && e.override.reason !== e.matchWhy ? `  |  decision: ${e.override.reason}` : ""}`);
            if (e.override.needsReview) continue;
            if (e.override.action === "link") linkedReady++;
            else if (e.override.action === "create") creates++;
            else skips++;
        }
        say(`\nReady: ${linkedReady} link(s), ${creates} create(s), ${skips} skip(s); ${entries.filter(e => e.override.needsReview).length} still need review.`);

        const stillReview = entries.filter(e => e.override.needsReview);
        if (stillReview.length > 0 || !fs.existsSync(OVERRIDE_PATH)) {
            writeOverrides(entries);
            say(`Wrote ${OVERRIDE_PATH}`);
            say("  Review each entry (action + needsReview), then re-run with --apply.");
        }

        if (!APPLY) {
            say("\nDry run complete - no writes performed.");
            logger.summary(`Dry run complete. entries=${entries.length} needsReview=${stillReview.length}`);
            return;
        }

        if (stillReview.length > 0 && !ALLOW_UNREVIEWED) {
            console.error(`\nAborting: ${stillReview.length} override(s) still need a decision in ${OVERRIDE_PATH}.`);
            process.exit(2);
        }

        // ---- validate + apply ----------------------------------------------
        let linked = 0;
        let created = 0;
        let skipped = 0;
        const stamped = new Date();

        for (const e of entries) {
            const o = e.override;
            if (o.action === "skip") {
                skipped++;
                logger.log(`${e.key} SKIP ${o.reason ?? ""}`);
                continue;
            }
            if (!["link", "create"].includes(o.action)) {
                console.error(`${e.key}: unknown action "${o.action}"`);
                process.exit(2);
            }

            let targetId: number | undefined;
            if (o.action === "link") {
                targetId = o.orgId;
                if (targetId === undefined) {
                    console.error(`${e.key}: action=link requires orgId`);
                    process.exit(2);
                }
                const name = await orgExists(db, targetId);
                if (name === null) {
                    console.error(`${e.key}: org #${targetId} does not exist`);
                    process.exit(2);
                }
            } else {
                const spec: OrgSpec = o.org ?? {
                    name: e.doc.sellerName ?? "",
                    pan: trimOrNull(e.doc.sellerPanNo),
                    address: trimOrNull(e.doc.sellerAddress),
                    gstNo: trimOrNull(e.doc.sellerGstNo),
                    contactEmail: trimOrNull(e.doc.sellerEmail),
                };
                if (!spec.name || !spec.name.trim()) {
                    console.error(`${e.key}: cannot create an organization without a name`);
                    process.exit(2);
                }
                const existing = byName.get(normName(spec.name)) ?? [];
                if (existing.length === 1) {
                    targetId = existing[0];
                } else {
                    const [org] = await db
                        .insert(vendorOrganizations)
                        .values({
                            name: spec.name,
                            pan: trimOrNull(spec.pan),
                            address: trimOrNull(spec.address),
                            msme: null,
                            msmeType: null,
                            alias: null,
                            status: true,
                            createdAt: stamped,
                            updatedAt: stamped,
                        })
                        .returning({ id: vendorOrganizations.id });
                    targetId = org.id;
                    created++;
                    logger.log(`vendor_organizations id=${org.id} INSERT "${spec.name}"  (${e.key})`);
                    const gst = trimOrNull(spec.gstNo);
                    if (gst) {
                        await db
                            .insert(vendorGsts)
                            .values({ orgId: org.id, gstNo: gst, gstState: null, address: trimOrNull(spec.address), createdAt: stamped, updatedAt: stamped });
                    }
                    const email = trimOrNull(spec.contactEmail);
                    if (email) {
                        await db.insert(vendors).values({ orgId: org.id, name: null, email, mobile: null, address: null, createdAt: stamped, updatedAt: stamped });
                    }
                }
            }

            const result = await db.execute(updateStmt(e.table, e.docId, targetId));
            const affected = (result as { rowCount?: number }).rowCount ?? 0;
            if (affected > 0) {
                linked++;
                logger.log(`${e.key} seller_organization_id = ${targetId}`);
            } else {
                skipped++;
            }
        }

        // ---- verify ---------------------------------------------------------
        const poResult = (await db.execute(sql`
            SELECT count(*)::int AS total,
                   count(*) FILTER (WHERE seller_organization_id IS NULL)::int AS nulls,
                   count(*) FILTER (WHERE seller_organization_id IS NOT NULL
                        AND NOT EXISTS (SELECT 1 FROM vendor_organizations o
                                        WHERE o.id = purchase_orders.seller_organization_id))::int AS dangling
            FROM purchase_orders`)) as unknown as { rows: { total: number; nulls: number; dangling: number }[] };
        const vwoResult = (await db.execute(sql`
            SELECT count(*)::int AS total,
                   count(*) FILTER (WHERE seller_organization_id IS NULL)::int AS nulls,
                   count(*) FILTER (WHERE seller_organization_id IS NOT NULL
                        AND NOT EXISTS (SELECT 1 FROM vendor_organizations o
                                        WHERE o.id = vendor_work_orders.seller_organization_id))::int AS dangling
            FROM vendor_work_orders`)) as unknown as { rows: { total: number; nulls: number; dangling: number }[] };
        const po = poResult.rows[0];
        const vwo = vwoResult.rows[0];

        const summary =
            `Organizations created:  ${created}\n` +
            `Documents linked:       ${linked} (skipped: ${skipped})\n` +
            `purchase_orders:        ${po.total} total, ${po.nulls} NULL, ${po.dangling} dangling\n` +
            `vendor_work_orders:     ${vwo.total} total, ${vwo.nulls} NULL, ${vwo.dangling} dangling`;
        say(`\n${summary}`);

        if (po.dangling > 0 || vwo.dangling > 0) {
            say("\nERROR: dangling seller_organization_id references found.");
            logger.summary(`Run FAILED.\n${summary}`);
            process.exit(3);
        }
        logger.summary(`Run complete.\n${summary}`);
    } finally {
        await pool.end();
    }
}

main().catch(err => {
    console.error("Backfill failed:", err);
    process.exit(1);
});
