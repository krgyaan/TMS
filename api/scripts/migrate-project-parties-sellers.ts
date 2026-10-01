/**
 * Data migration: move every `project_parties` row with type='seller' onto
 * vendor_organizations, then remove the seller rows so that `project_parties`
 * only holds 'ship_to' entries.
 *
 * Usage (from the api/ directory; DATABASE_URL is loaded from api/.env):
 *   pnpm migrate:seller-parties                 # dry run (SELECT only, no writes)
 *   pnpm migrate:seller-parties --apply          # link / create / backfill / archive / delete
 *   pnpm migrate:seller-parties --allow-unreviewed --apply   # skip the override review gate
 *
 * What --apply does, in order:
 *   1. resolves every seller to a vendor org (see match tiers below)
 *   2. creates a vendor_organizations + contact + GST row for sellers whose
 *      override says action = "create"
 *   3. backfills EMPTY vendor-master fields (pan/address/alias/msme/gst/contact)
 *      from the seller row - never overwrites existing vendor data
 *   4. backfills purchase_orders.seller_organization_id and
 *      vendor_work_orders.seller_organization_id by name -> PAN -> GST
 *   5. copies the original seller row (plus its resolution) into
 *      project_parties_sellers_archive
 *   6. deletes the seller row from project_parties
 *
 * Match tiers:
 *   EXACT_NAME  normalized name matches exactly one org, and any PAN/GST hit
 *               on the same seller includes that org            -> auto
 *   UNIQUE_ID   no name match, but exactly one org matches by PAN or GST       -> auto
 *   REVIEW      everything else: name vs PAN/GST disagreement, an identifier
 *               shared by several orgs, or no match at all        -> override
 *
 * Overrides live in scripts/seller-link-overrides.json, keyed by
 * project_parties.id. Four actions are understood:
 *   { "5":  { "action": "link",    "orgId": 234, "reason": "...", "needsReview": false } }
 *   { "125": { "action": "create", "reason": "genuinely new company", "needsReview": false } }
 *   { "2":  { "action": "discard", "reason": "Lorem-ipsum test row", "needsReview": false } }
 *   { "9":  { "action": "skip",    "reason": "leave for now", "needsReview": false } }
 *
 * link    -> resolve to orgId, then archive + delete the party row
 * create  -> insert a vendor organization, then archive + delete the party row
 * discard -> archive + delete the party row without creating anything
 * skip    -> leave the row in project_parties untouched (reported as unresolved)
 *
 * --apply refuses to run while any override still has needsReview: true.
 * It always runs before the schema migration that adds
 * CHECK (type = 'ship_to') to project_parties, because that constraint
 * requires the seller rows to be gone.
 */
import "dotenv/config";
import * as fs from "fs";
import * as path from "path";
import { sql, eq } from "drizzle-orm";
import { createPool, createDb } from "../src/db";
import { MigrationLogger } from "./migrationLogger";
import { projectParties } from "../src/db/schemas/operations/project-parties.schema";
import { purchaseOrders } from "../src/db/schemas/operations/purchase-orders.schema";
import { vendorWorkOrders } from "../src/db/schemas/operations/vendor-work-orders.schema";
import * as schema from "../src/db/schemas/vendors";

type Action = "link" | "create" | "skip" | "discard";
type Tier = "EXACT_NAME" | "UNIQUE_ID" | "REVIEW";

interface Override {
    action: Action;
    orgId?: number;
    reason?: string;
    needsReview?: boolean;
}

interface SellerRow {
    id: number;
    name: string | null;
    alias: string | null;
    pan: string | null;
    gstNo: string | null;
    msme: string | null;
    address: string | null;
    email: string | null;
    contactPerson: string | null;
    mobileNumber: string | null;
}

interface OrgRow {
    id: number;
    name: string;
    n: string;
    pan: string | null;
    address: string | null;
    alias: string | null;
    msme: string | null;
    msmeType: string | null;
}

interface Resolution {
    seller: SellerRow;
    tier: Tier;
    action: Action;
    orgId?: number;
    why: string;
}

/** lower-case, collapse runs of whitespace, trim - the only name matching we trust */
const norm = (v: string | null): string => (v ?? "").replace(/\s+/g, " ").trim().toLowerCase();
const trimOrNull = (v: string | null | undefined): string | null => {
    const t = (v ?? "").trim();
    return t === "" ? null : t;
};

const JUNK_MSME = new Set(["N/A", "NA", "N.A.", "NOT APPLICABLE", "NOT ACP", "-", "--", "NONE"]);
const isJunkMsme = (v: string | null): boolean => v === null || JUNK_MSME.has(v.toUpperCase());

const FLAGS = new Set(process.argv.slice(2));
const APPLY = FLAGS.has("--apply");
const ALLOW_UNREVIEWED = FLAGS.has("--allow-unreviewed");
const OVERRIDE_PATH = path.join(__dirname, "seller-link-overrides.json");

const reported: string[] = [];
const say = (line: string): void => {
    console.log(line);
    reported.push(line);
};

function loadOverrides(): Map<number, Override> {
    const map = new Map<number, Override>();
    if (!fs.existsSync(OVERRIDE_PATH)) return map;
    const raw = JSON.parse(fs.readFileSync(OVERRIDE_PATH, "utf8")) as Record<string, Override>;
    for (const [k, v] of Object.entries(raw)) map.set(Number(k), v);
    return map;
}

/** Writes the override file for every REVIEW-tier seller, preserving any decisions already made. */
function writeOverrides(resolutions: Resolution[]): void {
    const existing = loadOverrides();
    const next: Record<string, Override> = {};
    for (const r of resolutions) {
        if (r.tier !== "REVIEW") continue;
        const prior = existing.get(r.seller.id);
        if (prior) {
            next[String(r.seller.id)] = prior;
            continue;
        }
        // Pre-fill with the best guess: link when a name match exists, otherwise skip.
        // "create" is never guessed - a missing name match is not evidence of a new company.
        next[String(r.seller.id)] = {
            action: r.orgId !== undefined ? "link" : "skip",
            orgId: r.orgId,
            reason: r.why,
            needsReview: true,
        };
    }
    fs.writeFileSync(OVERRIDE_PATH, JSON.stringify(next, null, 4) + "\n");
    say(`\nWrote ${Object.keys(next).length} overrides to ${OVERRIDE_PATH}`);
    say("  For each: accept the pre-filled action and set needsReview to false,");
    say('  or change action to "link" + "orgId", "create", or "skip".');
}

/**
 * A GSTIN is 2-digit state + 10-char PAN + entity block, so when a seller has a
 * GST number but no PAN of its own, the PAN can be recovered from it. Party rows
 * in this data often carry a GST while leaving PAN blank, and the GST is
 * frequently truncated - position 3..12 still recovers the PAN either way.
 */
function panOf(seller: SellerRow): string | null {
    const own = trimOrNull(seller.pan);
    if (own) return own.toLowerCase();

    const gst = (seller.gstNo ?? "").toUpperCase().replace(/-/g, "").trim();
    if (gst.length >= 12) return gst.slice(2, 12).toLowerCase();
    return null;
}

/**
 * Computes the match tier for one seller, ignoring any override.
 * A seller is automatic only when the name matches and no identifier disagrees,
 * or when exactly one org matches by identifier alone.
 */
function tierSeller(
    seller: SellerRow,
    orgById: Map<number, OrgRow>,
    byName: Map<string, number[]>,
    byPan: Map<string, number[]>,
    byGst: Map<string, number[]>
): { tier: Tier; orgId?: number; why: string } {
    const n = norm(seller.name);
    const nameHits = byName.get(n) ?? [];
    const panKey = panOf(seller);
    const gstKey = (seller.gstNo ?? "").toUpperCase().replace(/-/g, "").trim();
    const panHits = panKey ? (byPan.get(panKey) ?? []) : [];
    const gstHits = gstKey ? (byGst.get(gstKey) ?? []) : [];
    const idHits = [...new Set([...panHits, ...gstHits])];

    if (nameHits.length === 1) {
        const target = nameHits[0];
        const others = idHits.filter(id => id !== target);

        if (idHits.length > 0 && others.length > 0 && !idHits.includes(target)) {
            return {
                tier: "REVIEW",
                why: `name -> org ${target} (${orgById.get(target)?.name}), but PAN/GST -> ${others.map(id => `${id} (${orgById.get(id)?.name})`).join(", ")}`,
            };
        }
        if (others.length > 0) {
            // The name matched, but the identifier is shared with other orgs.
            // That is vendor-master duplication, not a seller conflict: prefer the name.
            return {
                tier: "EXACT_NAME",
                orgId: target,
                why: `exact name match -> ${orgById.get(target)?.name} (identifier also shared with ${others.join(", ")})`,
            };
        }
        return { tier: "EXACT_NAME", orgId: target, why: "exact name match" };
    }

    if (nameHits.length > 1) {
        return { tier: "REVIEW", why: `normalized name matches ${nameHits.length} orgs: ${nameHits.join(", ")}` };
    }

    if (idHits.length === 1) {
        return {
            tier: "UNIQUE_ID",
            orgId: idHits[0],
            why: `unique ${panHits.length ? "PAN" : "GST"} match -> ${orgById.get(idHits[0])?.name ?? idHits[0]}`,
        };
    }

    if (idHits.length > 1) {
        return {
            tier: "REVIEW",
            why: `no name match; identifier shared by ${idHits.map(id => `${id} (${orgById.get(id)?.name})`).join(", ")}`,
        };
    }

    return { tier: "REVIEW", why: "no name, PAN or GST match - decide link (fuzzy candidate) or create" };
}

/** Applies the human override on top of the computed tier, if one exists. */
function resolveSeller(
    seller: SellerRow,
    orgById: Map<number, OrgRow>,
    byName: Map<string, number[]>,
    byPan: Map<string, number[]>,
    byGst: Map<string, number[]>,
    overrides: Map<number, Override>
): Resolution {
    const base = tierSeller(seller, orgById, byName, byPan, byGst);
    const override = overrides.get(seller.id);

    if (override) {
        const reason = override.reason ? `override: ${override.reason}` : "override";
        return {
            seller,
            tier: base.tier,
            action: override.action,
            orgId: override.action === "link" ? override.orgId : undefined,
            why: override.action === "skip" && !override.reason ? base.why : reason,
        };
    }

    return { seller, tier: base.tier, action: base.tier === "REVIEW" ? "skip" : "link", orgId: base.orgId, why: base.why };
}

async function main(): Promise<void> {
    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl) {
        console.error("DATABASE_URL not set - set it in the environment or api/.env.");
        process.exit(1);
    }

    const logger = new MigrationLogger("./migration-logs", APPLY ? "seller-parties" : "seller-parties-dryrun");
    logger.log(`Mode: ${APPLY ? "apply" : "dry run (SELECT only)"}`);
    say(`Mode: ${APPLY ? "APPLY" : "DRY RUN"}`);

    const pool = createPool(dbUrl, 2, process.env.PGSSL === "true");
    const db = createDb(pool);

    try {
        const [sellers, orgs, gsts] = await Promise.all([
            db
                .select()
                .from(projectParties)
                .where(sql`${projectParties.type} = 'seller'`) as Promise<SellerRow[]>,
            db
                .select({
                    id: schema.vendorOrganizations.id,
                    name: schema.vendorOrganizations.name,
                    pan: schema.vendorOrganizations.pan,
                    address: schema.vendorOrganizations.address,
                    alias: schema.vendorOrganizations.alias,
                    msme: schema.vendorOrganizations.msme,
                    msmeType: schema.vendorOrganizations.msmeType,
                })
                .from(schema.vendorOrganizations) as Promise<Omit<OrgRow, "n">[]>,
            db.select().from(schema.vendorGsts),
        ] as const);

        say(`\nSources: ${sellers.length} project_parties sellers, ${orgs.length} vendor organizations`);

        if (sellers.length === 0) {
            say("Nothing to do - no seller rows in project_parties.");
            logger.summary("No seller rows found.");
            return;
        }

        const orgById = new Map<number, OrgRow>();
        const byName = new Map<string, number[]>();
        const byPan = new Map<string, number[]>();
        const byGst = new Map<string, number[]>();
        const push = (map: Map<string, number[]>, key: string, id: number): void => {
            const list = map.get(key);
            if (list) list.push(id);
            else map.set(key, [id]);
        };

        for (const o of orgs) {
            const withN: OrgRow = { ...o, n: norm(o.name) };
            orgById.set(o.id, withN);
            if (withN.n) push(byName, withN.n, o.id);
            if (o.pan) push(byPan, o.pan.trim().toLowerCase(), o.id);
        }
        for (const g of gsts) {
            const gst = (g.gstNo ?? "").toUpperCase().replace(/-/g, "");
            if (gst && g.orgId) push(byGst, gst, g.orgId);
        }

        const overrides = loadOverrides();
        const resolutions = sellers.map(s => resolveSeller(s, orgById, byName, byPan, byGst, overrides));

        // ---- report -----------------------------------------------------
        const byTier = { EXACT_NAME: 0, UNIQUE_ID: 0, REVIEW: 0 };
        const byAction: Record<Action, number> = { link: 0, create: 0, skip: 0, discard: 0 };
        for (const r of resolutions) {
            byTier[r.tier]++;
            byAction[r.action]++;
        }

        say(`\nMatch tiers: EXACT_NAME ${byTier.EXACT_NAME}  UNIQUE_ID ${byTier.UNIQUE_ID}  REVIEW ${byTier.REVIEW}`);
        say(`Actions:     link ${byAction.link}  create ${byAction.create}  discard ${byAction.discard}  skip ${byAction.skip}`);

        // A REVIEW-tier row is settled only once its override carries needsReview: false.
        const stillReview = resolutions.filter(r => {
            if (r.tier !== "REVIEW") return false;
            return overrides.get(r.seller.id)?.needsReview !== false;
        });
        if (stillReview.length > 0) {
            say(`\n${stillReview.length} seller(s) still need a decision:`);
            for (const r of stillReview) {
                say(`  #${r.seller.id}  ${r.seller.name ?? "(unnamed)"}`);
                say(`      PAN ${(r.seller.pan ?? "-").trim()}   GST ${(r.seller.gstNo ?? "-").trim()}`);
                say(`      ${r.why}`);
            }
            writeOverrides(resolutions);
        } else {
            say("\nAll REVIEW-tier sellers have decisions recorded.");
        }

        // MSME left without a type - the caller's chosen behaviour, surfaced so it is not a surprise.
        const msmeNoType = resolutions.flatMap(r => {
            if (r.action !== "link" || r.orgId === undefined) return [];
            const msme = trimOrNull(r.seller.msme);
            if (isJunkMsme(msme)) return [];
            const org = orgById.get(r.orgId);
            if (!org || org.msmeType !== null || org.msme !== null) return [];
            return [{ orgId: r.orgId, orgName: org.name, msme, sellerId: r.seller.id }];
        });
        if (msmeNoType.length > 0) {
            say(`\n${msmeNoType.length} org(s) will receive an msme number with msmeType left null:`);
            for (const row of msmeNoType) say(`  org ${row.orgId} (${row.orgName}) <- "${row.msme}" from seller #${row.sellerId}`);
            say("  These will fail validation on the next edit in Vendor Master until a type is chosen.");
        }

        const junkMsme = resolutions.filter(r => trimOrNull(r.seller.msme) !== null && isJunkMsme(trimOrNull(r.seller.msme)));
        if (junkMsme.length > 0) {
            say(`\n${junkMsme.length} seller(s) carry a junk msme value that will NOT be copied:`);
            for (const r of junkMsme) say(`  seller #${r.seller.id}  msme="${r.seller.msme}"`);
        }

        if (!APPLY) {
            say("\nDry run complete - no writes performed. Re-run with --apply to execute.");
            logger.summary("Dry run complete.");
            return;
        }

        if (stillReview.length > 0 && !ALLOW_UNREVIEWED) {
            console.error(`\nAborting: ${stillReview.length} seller(s) still need a decision.`);
            console.error(`Edit ${OVERRIDE_PATH} first, then re-run, or pass --allow-unreviewed to accept the defaults.`);
            process.exit(2);
        }

        // ---- apply --------------------------------------------------------
        const stamped = new Date();
        let orgsCreated = 0;
        let fieldsBackfilled = 0;
        let gstsInserted = 0;
        let contactsInserted = 0;
        let archived = 0;
        let deleted = 0;
        let unresolved = 0;

        await db.execute(sql`
            CREATE TABLE IF NOT EXISTS project_parties_sellers_archive (
                id                      bigint PRIMARY KEY,
                vendor_organization_id  bigint,
                name                    varchar(255),
                alias                   varchar(255),
                gst_no                  varchar(50),
                msme                    varchar(50),
                pan                     varchar(100),
                address                 text,
                email                   varchar(100),
                contact_person          varchar(255),
                mobile_number           varchar(20),
                type                    varchar(20),
                is_active               boolean,
                created_at              timestamptz,
                updated_at              timestamptz,
                resolved_org_id         bigint,
                match_tier              varchar(20),
                action                  varchar(20),
                matched_by              text,
                archived_at             timestamptz NOT NULL DEFAULT now()
            )
        `);

        const createdNames = new Map<string, number>();

        for (const r of resolutions) {
            if (r.action === "skip") {
                // Left in place on purpose: nothing resolved, so it must not vanish
                // from the app. Reported at the end so it stays on the radar.
                unresolved++;
                continue;
            }

            if (r.action === "discard") {
                await archive(db, r, stamped);
                archived++;
                await db.execute(sql`DELETE FROM project_parties WHERE id = ${r.seller.id}`);
                deleted++;
                logger.log(`seller #${r.seller.id} "${r.seller.name}" DISCARD (${r.why}) - archived and removed`);
                continue;
            }

            if (r.action === "create") {
                const key = norm(r.seller.name);
                const alreadyCreated = createdNames.get(key);
                const existingHit = byName.get(key);

                if (alreadyCreated || (existingHit && existingHit.length === 1)) {
                    r.orgId = alreadyCreated ?? existingHit![0];
                    r.action = "link";
                } else if (!r.seller.name) {
                    say(`  ! seller #${r.seller.id} has no name - cannot create an organization`);
                    continue;
                } else {
                    const [org] = await db
                        .insert(schema.vendorOrganizations)
                        .values({
                            name: r.seller.name,
                            alias: trimOrNull(r.seller.alias),
                            pan: trimOrNull(r.seller.pan),
                            address: trimOrNull(r.seller.address),
                            msme: isJunkMsme(trimOrNull(r.seller.msme)) ? null : trimOrNull(r.seller.msme),
                            msmeType: null,
                            status: true,
                            createdAt: stamped,
                            updatedAt: stamped,
                        })
                        .returning({ id: schema.vendorOrganizations.id });

                    createdNames.set(key, org.id);
                    r.orgId = org.id;
                    orgsCreated++;
                    logger.log(`vendor_organizations id=${org.id} INSERT "${r.seller.name}"  (${r.why})`);

                    const gst = trimOrNull(r.seller.gstNo);
                    if (gst) {
                        await db
                            .insert(schema.vendorGsts)
                            .values({ orgId: org.id, gstNo: gst, gstState: null, address: trimOrNull(r.seller.address), createdAt: stamped, updatedAt: stamped });
                        gstsInserted++;
                    }
                    const contactName = trimOrNull(r.seller.contactPerson);
                    if (contactName || r.seller.email || r.seller.mobileNumber) {
                        await db.insert(schema.vendors).values({
                            orgId: org.id,
                            name: contactName,
                            email: trimOrNull(r.seller.email),
                            mobile: trimOrNull(r.seller.mobileNumber),
                            address: null,
                            createdAt: stamped,
                            updatedAt: stamped,
                        });
                        contactsInserted++;
                    }
                }
            }

            if (r.action === "link" && r.orgId !== undefined) {
                const org = orgById.get(r.orgId);
                if (org) {
                    const patch: Partial<typeof schema.vendorOrganizations.$inferInsert> = {};
                    if (!org.pan && trimOrNull(r.seller.pan)) {
                        patch.pan = trimOrNull(r.seller.pan);
                    }
                    if (!org.address && trimOrNull(r.seller.address)) {
                        patch.address = trimOrNull(r.seller.address);
                    }
                    if (!org.alias && trimOrNull(r.seller.alias)) {
                        patch.alias = trimOrNull(r.seller.alias);
                    }
                    if (!org.msme && !isJunkMsme(trimOrNull(r.seller.msme))) {
                        patch.msme = trimOrNull(r.seller.msme);
                    }
                    if (Object.keys(patch).length > 0) {
                        const changed = Object.keys(patch).length;
                        await db
                            .update(schema.vendorOrganizations)
                            .set({ ...patch, updatedAt: stamped })
                            .where(eq(schema.vendorOrganizations.id, r.orgId));
                        fieldsBackfilled += changed;
                        logger.log(`vendor_organizations id=${r.orgId} BACKFILL ${Object.keys(patch).join(", ")}`);
                    }

                    const orgGsts = new Set(gsts.filter(g => g.orgId === r.orgId).map(g => (g.gstNo ?? "").toUpperCase().replace(/-/g, "")));
                    const gst = trimOrNull(r.seller.gstNo);
                    if (gst && !orgGsts.has(gst.toUpperCase().replace(/-/g, ""))) {
                        await db.insert(schema.vendorGsts).values({ orgId: r.orgId, gstNo: gst, gstState: null, address: null, createdAt: stamped, updatedAt: stamped });
                        gstsInserted++;
                    }

                    const hasPerson = await db
                        .select({ id: schema.vendors.id })
                        .from(schema.vendors)
                        .where(sql`${schema.vendors.orgId} = ${r.orgId}`)
                        .limit(1);
                    if (hasPerson.length === 0 && (trimOrNull(r.seller.contactPerson) || r.seller.email || r.seller.mobileNumber)) {
                        await db.insert(schema.vendors).values({
                            orgId: r.orgId,
                            name: trimOrNull(r.seller.contactPerson),
                            email: trimOrNull(r.seller.email),
                            mobile: trimOrNull(r.seller.mobileNumber),
                            address: null,
                            createdAt: stamped,
                            updatedAt: stamped,
                        });
                        contactsInserted++;
                    }
                }
            }

            await archive(db, r, stamped);
            archived++;
            await db.execute(sql`DELETE FROM project_parties WHERE id = ${r.seller.id}`);
            deleted++;
            logger.log(`seller #${r.seller.id} "${r.seller.name}" -> vendor org ${r.orgId} [${r.tier}] (${r.why})`);
        }

        // ---- PO / VWO backfill -------------------------------------------
        // Re-read everything so organizations created earlier in this run are included.
        const refreshByName = new Map<string, number[]>();
        const refreshByPan = new Map<string, number[]>();
        const refreshByGst = new Map<string, number[]>();
        const add = (map: Map<string, number[]>, key: string, id: number): void => {
            const list = map.get(key);
            if (list) list.push(id);
            else map.set(key, [id]);
        };

        const freshOrgs = await db
            .select({ id: schema.vendorOrganizations.id, name: schema.vendorOrganizations.name, pan: schema.vendorOrganizations.pan })
            .from(schema.vendorOrganizations);
        const freshGsts = await db.select({ orgId: schema.vendorGsts.orgId, gstNo: schema.vendorGsts.gstNo }).from(schema.vendorGsts);

        for (const o of freshOrgs) {
            const key = norm(o.name);
            if (key) add(refreshByName, key, o.id);
            if (trimOrNull(o.pan)) add(refreshByPan, trimOrNull(o.pan)!.toLowerCase(), o.id);
        }
        for (const g of freshGsts) {
            const key = (g.gstNo ?? "").toUpperCase().replace(/-/g, "");
            if (key && g.orgId) add(refreshByGst, key, g.orgId);
        }

        const unresolvable: string[] = [];
        let poLinked = 0,
            poSkipped = 0;
        const poRows = await db
            .select({
                id: purchaseOrders.id,
                sellerName: purchaseOrders.sellerName,
                sellerPanNo: purchaseOrders.sellerPanNo,
                sellerGstNo: purchaseOrders.sellerGstNo,
                sellerOrganizationId: purchaseOrders.sellerOrganizationId,
            })
            .from(purchaseOrders);
        for (const po of poRows) {
            if (po.sellerOrganizationId !== null && po.sellerOrganizationId !== undefined) continue;
            const orgId = matchDoc(po.sellerName, po.sellerPanNo, po.sellerGstNo, refreshByName, refreshByPan, refreshByGst);
            if (orgId === undefined) {
                if (trimOrNull(po.sellerName)) unresolvable.push(`purchase_orders #${po.id} "${po.sellerName}"`);
                poSkipped++;
                continue;
            }
            await db.execute(sql`UPDATE purchase_orders SET seller_organization_id = ${orgId} WHERE id = ${po.id}`);
            poLinked++;
        }

        let vwoLinked = 0,
            vwoSkipped = 0;
        const vwoRows = await db
            .select({
                id: vendorWorkOrders.id,
                sellerName: vendorWorkOrders.sellerName,
                sellerPanNo: vendorWorkOrders.sellerPanNo,
                sellerGstNo: vendorWorkOrders.sellerGstNo,
                sellerOrganizationId: vendorWorkOrders.sellerOrganizationId,
            })
            .from(vendorWorkOrders);
        for (const w of vwoRows) {
            if (w.sellerOrganizationId !== null && w.sellerOrganizationId !== undefined) continue;
            const orgId = matchDoc(w.sellerName, w.sellerPanNo, w.sellerGstNo, refreshByName, refreshByPan, refreshByGst);
            if (orgId === undefined) {
                if (trimOrNull(w.sellerName)) unresolvable.push(`vendor_work_orders #${w.id} "${w.sellerName}"`);
                vwoSkipped++;
                continue;
            }
            await db.execute(sql`UPDATE vendor_work_orders SET seller_organization_id = ${orgId} WHERE id = ${w.id}`);
            vwoLinked++;
        }

        const summary =
            `Organizations created:  ${orgsCreated}\n` +
            `Org fields backfilled:  ${fieldsBackfilled}\n` +
            `GST rows inserted:      ${gstsInserted}\n` +
            `Contacts inserted:      ${contactsInserted}\n` +
            `Sellers archived:       ${archived}\n` +
            `Sellers deleted:        ${deleted}\n` +
            `Sellers left in place:  ${unresolved} (action: skip)\n` +
            `purchase_orders linked:   ${poLinked} (left NULL: ${poSkipped})\n` +
            `vendor_work_orders linked: ${vwoLinked} (left NULL: ${vwoSkipped})`;
        say(`\n${summary}`);
        if (unresolvable.length > 0) {
            say(`\n${unresolvable.length} document(s) have a seller name matching no vendor org - left NULL for manual review:`);
            for (const u of unresolvable) say(`  ${u}`);
        }
        logger.summary(`Run complete.\n${summary}`);
    } finally {
        await pool.end();
    }
}

async function archive(db: ReturnType<typeof createDb>, r: Resolution, stamped: Date): Promise<void> {
    const s = r.seller;
    await db.execute(sql`
        INSERT INTO project_parties_sellers_archive
            (id, vendor_organization_id, name, alias, gst_no, msme, pan, address, email,
             contact_person, mobile_number, type, is_active, created_at, updated_at,
             resolved_org_id, match_tier, action, matched_by, archived_at)
        VALUES
            (${s.id}, null, ${s.name}, ${s.alias}, ${s.gstNo}, ${s.msme}, ${s.pan},
             ${s.address}, ${s.email}, ${s.contactPerson}, ${s.mobileNumber}, 'seller', true,
             ${stamped}, ${stamped}, ${r.orgId ?? null}, ${r.tier}, ${r.action}, ${r.why}, now())
        ON CONFLICT (id) DO UPDATE SET
            resolved_org_id = EXCLUDED.resolved_org_id,
            match_tier      = EXCLUDED.match_tier,
            action          = EXCLUDED.action,
            matched_by      = EXCLUDED.matched_by,
            archived_at     = now()
    `);
}

/**
 * Resolve a denormalized PO/VWO seller by name, then PAN, then GST.
 * Only a *unique* identifier hit counts - a PAN shared by two orgs resolves nothing.
 */
function matchDoc(
    sellerName: string | null,
    pan: string | null,
    gst: string | null,
    byName: Map<string, number[]>,
    byPan: Map<string, number[]>,
    byGst: Map<string, number[]>
): number | undefined {
    const nameHits = byName.get(norm(sellerName));
    if (nameHits?.length === 1) return nameHits[0];

    // PAN can be recovered from a GSTIN when the PAN column itself is blank.
    const gstKey = (gst ?? "").toUpperCase().replace(/-/g, "").trim();
    const panKey = trimOrNull(pan)?.toLowerCase() ?? (gstKey.length >= 12 ? gstKey.slice(2, 12).toLowerCase() : null);
    if (panKey) {
        const hits = byPan.get(panKey);
        if (hits && new Set(hits).size === 1) return hits[0];
    }

    if (gstKey) {
        const hits = byGst.get(gstKey);
        if (hits && new Set(hits).size === 1) return hits[0];
    }
    return undefined;
}

main().catch(err => {
    console.error("Migration failed:", err);
    process.exit(1);
});
