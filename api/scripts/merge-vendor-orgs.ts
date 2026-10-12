/**
 * Detect-driven merge of duplicate vendor_organizations rows.
 *
 * Supersedes merge-vendor-organization-duplicates.ts and
 * merge-best-power-vendor-org.ts, whose hard-coded id pairs only made sense
 * for the one database they were written against. This tool reads and writes
 * the TARGET database, so it is safe to run anywhere (dev, live, a restore)
 * and re-run any time new duplicates appear.
 *
 * Workflow:
 *   1. pnpm merge:vendor-orgs --detect
 *        scans the database and writes scripts/vendor-org-merge-plan.json:
 *        - "candidates"  groups you can merge after review
 *            same-name          normalized names identical        -> pre-filled action=merge
 *            shared-identifier  same PAN and/or GST, names differ
 *                               AND at least two orgs share an address
 *                                                             -> pre-filled action=skip
 *        - "pollution"   identifiers shared by orgs with different names
 *                       AND no address agreement - report only, never merged.
 *                       To merge one anyway, copy its orgs into "candidates"
 *                       (see _instructions in the plan file).
 *   2. Review the JSON: confirm/change keep+drops, set action, set
 *      needsReview to false. --apply refuses to run while any candidate
 *      still needsReview.
 *      OR: to merge a pollution group you have verified as a real duplicate,
 *      add it to scripts/vendor-org-merge-promotions.json (orgIds + keep)
 *      and run with --promote - that file is the review record.
 *   3. pnpm merge:vendor-orgs              # dry run (SELECT only)
 *      pnpm merge:vendor-orgs --promote    # dry run incl. promotions (also persists them)
 *      pnpm merge:vendor-orgs --apply      # archive + re-point + deactivate
 *   4. pnpm merge:vendor-orgs --rollback   # undo every merge in the archive
 *
 * Merging NEVER deletes a vendor_organizations row: the duplicate is
 * deactivated (status = false) after its references are re-pointed to the
 * keeper, so historical rows keep existing (and keep their ids).
 *
 * Per merge (--apply, one transaction per drop):
 *   archive the dropped row into vendor_organizations_dups_archive (with the
 *   moved primary keys and any filled fields) -> fill the keeper's EMPTY
 *   identifying fields from the dropped row -> re-point every reference
 *   (vendors, vendor_gsts, vendor_accs, vendor_files, projects,
 *   purchase_orders, vendor_work_orders, rfq_responses, seller archive) ->
 *   refuse to finish while anything still points at the dropped id ->
 *   deactivate the dropped row (status = false).
 *
 * --detect preserves decisions already recorded in the plan file for groups
 * whose member set has not changed.
 */
import "dotenv/config";
import * as fs from "fs";
import * as path from "path";
import { sql, type SQL } from "drizzle-orm";
import { createPool, createDb } from "../src/db";
import { MigrationLogger } from "./migrationLogger";

// ------------------------------------------------------------------ types ---

interface OrgDetail {
    id: number;
    name: string;
    pan: string | null;
    address: string | null;
    status: boolean;
    createdAt: string;
    gsts: number;
    contacts: number;
    banks: number;
    files: number;
    poRefs: number;
    vwoRefs: number;
    rfqRefs: number;
    projectRefs: number;
}

type CandidateClassification = "same-name" | "shared-identifier";

interface Candidate {
    key: string;
    classification: CandidateClassification;
    addressMatch: boolean;
    matchedOn: string[];
    orgs: OrgDetail[];
    suggestedKeep: number;
    why: string;
    /** human decision */
    action: "merge" | "skip";
    keep: number;
    drops: number[];
    needsReview: boolean;
}

interface PollutionGroup {
    orgs: { id: number; name: string; pan: string | null }[];
    matchedOn: string[];
    why: string;
}

interface PlanFile {
    _instructions: string;
    generatedAt: string;
    candidates: Candidate[];
    pollution: PollutionGroup[];
}

/** One human-approved promotion of a pollution group into a merge candidate. */
interface PromotionSpec {
    /** exact org-id set of the pollution group being promoted */
    orgIds: number[];
    keep: number;
    drops?: number[];
    why?: string;
}

interface PromotionsFile {
    _note?: string;
    promotions: PromotionSpec[];
}

interface RefColumn {
    table: string;
    column: string;
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

// -------------------------------------------------------------- constants ---

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

const FILL_COLUMNS = ["alias", "pan", "msme", "msme_type", "address"] as const;

const DEFAULT_PLAN_PATH = path.join(__dirname, "vendor-org-merge-plan.json");
const DEFAULT_PROMOTIONS_PATH = path.join(__dirname, "vendor-org-merge-promotions.json");

const INSTRUCTIONS = [
    "Review every entry in `candidates`, then set needsReview to false.",
    '  action "merge"  applies keep+drops as written (keep survives, drops are re-pointed to keep and deactivated - never deleted).',
    '  action "skip"   leaves the group untouched.',
    "  keep/drops may be re-assigned to any org ids listed in `orgs`.",
    "`pollution` is report-only (identifiers shared by unrelated companies).",
    "To merge a pollution group anyway, add an entry to",
    "scripts/vendor-org-merge-promotions.json and re-run with --promote",
    "(that file is the review record: set keep/drops there).",
    "Re-running --detect preserves your edits and promotions for groups",
    "whose members did not change.",
].join("\n");

// ------------------------------------------------------------------ flags ---

const FLAGS = new Set(process.argv.filter(a => !a.startsWith("--plan") && !a.startsWith("--promotions")));
const planArgIndex = process.argv.indexOf("--plan");
const promotionsArgIndex = process.argv.indexOf("--promotions");
const PLAN_PATH = planArgIndex >= 0 && process.argv[planArgIndex + 1] ? path.resolve(process.argv[planArgIndex + 1]) : DEFAULT_PLAN_PATH;
const PROMOTIONS_PATH = promotionsArgIndex >= 0 && process.argv[promotionsArgIndex + 1] ? path.resolve(process.argv[promotionsArgIndex + 1]) : DEFAULT_PROMOTIONS_PATH;
const DETECT = FLAGS.has("--detect");
const APPLY = FLAGS.has("--apply");
const ROLLBACK = FLAGS.has("--rollback");
const ALLOW_UNREVIEWED = FLAGS.has("--allow-unreviewed");
const PROMOTE = FLAGS.has("--promote");

const failures: string[] = [];
const check = (label: string, ok: boolean, detail = ""): boolean => {
    if (!ok) failures.push(`${label}${detail ? ` — ${detail}` : ""}`);
    console.log(`${ok ? "PASS" : "FAIL"}  ${label}${detail ? `  (${detail})` : ""}`);
    return ok;
};

// ------------------------------------------------------------ normalizers ---

const normName = (v: string | null): string => (v ?? "").replace(/\s+/g, " ").trim().toLowerCase();
const normAddress = (v: string | null): string =>
    (v ?? "")
        .replace(/[.,#/\\-]/g, " ")
        .replace(/\s+/g, " ")
        .trim()
        .toLowerCase();
const normPan = (v: string | null): string => (v ?? "").trim().toLowerCase();
const normGst = (v: string | null): string => (v ?? "").toUpperCase().replace(/[^A-Z0-9]/g, "");
const isEmpty = (v: unknown): boolean => v === null || v === undefined || (typeof v === "string" && v.trim() === "");
const ident = (name: string): SQL => sql.raw(`"${name.replace(/"/g, '""')}"`);
const quote = (v: unknown): string => (typeof v === "string" ? JSON.stringify(v) : String(v));

async function rows<T>(db: Executor, query: SQL): Promise<T[]> {
    const result = (await db.execute(query)) as { rows: T[] };
    return result.rows;
}

// --------------------------------------------------------------- union-find ---

class UnionFind {
    private parent = new Map<string, string>();

    find(x: string): string {
        let root = this.parent.get(x) ?? x;
        if (!this.parent.has(x)) this.parent.set(x, x);
        while (root !== (this.parent.get(root) ?? root)) {
            root = this.parent.get(root)!;
        }
        // path compression
        let cur = x;
        while (cur !== root) {
            const next = this.parent.get(cur)!;
            this.parent.set(cur, root);
            cur = next;
        }
        return root;
    }

    union(a: string, b: string): void {
        const ra = this.find(a);
        const rb = this.find(b);
        if (ra !== rb) this.parent.set(rb, ra);
    }

    components(): Map<string, string[]> {
        const out = new Map<string, string[]>();
        for (const key of this.parent.keys()) {
            const root = this.find(key);
            const list = out.get(root);
            if (list) list.push(key);
            else out.set(root, [key]);
        }
        return out;
    }
}

// ------------------------------------------------------------------ detect ---

interface RawOrg {
    id: number;
    name: string;
    pan: string | null;
    address: string | null;
    alias: string | null;
    msme: string | null;
    msmeType: string | null;
    status: boolean;
    createdAt: string;
}

interface RawGst {
    orgId: number | null;
    gstNo: string | null;
}

const REF_COUNT_COLUMNS = [
    { table: "vendors", column: "org_id", field: "contacts" },
    { table: "vendor_accs", column: "org_id", field: "banks" },
    { table: "vendor_files", column: "org_id", field: "files" },
    { table: "projects", column: "org_id", field: "projectRefs" },
    { table: "purchase_orders", column: "seller_organization_id", field: "poRefs" },
    { table: "vendor_work_orders", column: "seller_organization_id", field: "vwoRefs" },
    { table: "rfq_responses", column: "organization_id", field: "rfqRefs" },
] as const;

async function detect(db: Executor): Promise<PlanFile> {
    // Only ACTIVE orgs participate: rows deactivated by a previous merge are
    // finished business and must never re-appear as candidates.
    const orgs = await rows<RawOrg>(
        db,
        sql`select id::int as id, name, pan, address, alias, msme,
                   msme_type as "msmeType", status, created_at::text as "createdAt"
            from vendor_organizations
            where status
            order by id`
    );
    const gsts = await rows<RawGst>(db, sql`select org_id::int as "orgId", gst_no as "gstNo" from vendor_gsts`);

    const gstCount = new Map<number, number>();
    for (const g of gsts) {
        if (g.orgId === null) continue;
        gstCount.set(g.orgId, (gstCount.get(g.orgId) ?? 0) + 1);
    }

    const refCounts = new Map<number, Record<string, number>>();
    for (const ref of REF_COUNT_COLUMNS) {
        const counted = await rows<{ orgId: number; n: number }>(
            db,
            sql`select ${ident(ref.column)}::int as "orgId", count(*)::int as n
                from ${ident(ref.table)}
                where ${ident(ref.column)} is not null
                group by 1`
        );
        for (const c of counted) {
            const rec = refCounts.get(Number(c.orgId));
            if (rec) rec[ref.field] = (rec[ref.field] ?? 0) + Number(c.n);
            else refCounts.set(Number(c.orgId), { [ref.field]: Number(c.n) });
        }
    }

    const orgById = new Map<number, OrgDetail>();
    for (const o of orgs) {
        const refs = refCounts.get(o.id) ?? {};
        orgById.set(o.id, {
            id: o.id,
            name: o.name,
            pan: o.pan,
            address: o.address,
            status: o.status,
            createdAt: o.createdAt,
            gsts: gstCount.get(o.id) ?? 0,
            contacts: refs.contacts ?? 0,
            banks: refs.banks ?? 0,
            files: refs.files ?? 0,
            poRefs: refs.poRefs ?? 0,
            vwoRefs: refs.vwoRefs ?? 0,
            rfqRefs: refs.rfqRefs ?? 0,
            projectRefs: refs.projectRefs ?? 0,
        });
    }

    // ---- group orgs by every natural key --------------------------------
    const uf = new UnionFind();
    const keyMembers = new Map<string, number[]>();
    const addKey = (key: string, orgId: number): void => {
        const list = keyMembers.get(key);
        if (list) list.push(orgId);
        else keyMembers.set(key, [orgId]);
        uf.union(`org:${orgId}`, key);
    };
    const matchedOnByKey = new Map<string, string>();

    for (const o of orgs) {
        const nk = normName(o.name);
        if (nk) {
            addKey(`n:${nk}`, o.id);
            matchedOnByKey.set(`n:${nk}`, "name");
        }
        const pk = normPan(o.pan);
        if (pk && pk !== "") {
            addKey(`p:${pk}`, o.id);
            matchedOnByKey.set(`p:${pk}`, "pan");
        }
    }
    for (const g of gsts) {
        if (g.orgId === null) continue;
        if (!orgById.has(g.orgId)) continue; // gst attached to an inactive/unknown org
        const gk = normGst(g.gstNo);
        if (gk.length !== 15) continue; // real GSTINs are 15 chars; shorter values are junk/truncated
        addKey(`g:${gk}`, g.orgId);
        matchedOnByKey.set(`g:${gk}`, "gst");
    }

    // ---- build components ------------------------------------------------
    const components = uf.components();
    const groups: number[][] = [];
    for (const keys of components.values()) {
        const members = new Set<number>();
        for (const key of keys) {
            if (key.startsWith("org:")) members.add(Number(key.slice(4)));
            const ids = keyMembers.get(key);
            if (ids) for (const id of ids) members.add(id);
        }
        if (members.size > 1) groups.push([...members].sort((a, b) => a - b));
    }

    // ---- classify --------------------------------------------------------
    const prior = loadPlan(PLAN_PATH);
    const priorBySignature = new Map<string, Candidate>();
    for (const c of prior?.candidates ?? []) {
        priorBySignature.set(signature(c.orgs.map(o => o.id)), c);
    }

    const candidates: Candidate[] = [];
    const pollution: PollutionGroup[] = [];

    for (const memberIds of groups) {
        const members = memberIds.map(id => orgById.get(id)!).filter(Boolean);

        const matched = new Set<string>();
        for (const key of keysOfGroup(memberIds, keyMembers)) {
            const label = matchedOnByKey.get(key);
            if (label) matched.add(label);
        }

        const nonEmptyNames = new Set(members.map(o => normName(o.name)).filter(Boolean));
        const addresses = members.map(o => normAddress(o.address)).filter(Boolean);
        const addressMatch = new Set(addresses).size < addresses.length; // a duplicate address exists

        const suggestedKeep = pickKeeper(members);
        const sig = signature(memberIds);
        const priorCandidate = priorBySignature.get(sig);

        const base = {
            key: sig,
            matchedOn: [...matched].sort(),
            orgs: members,
            suggestedKeep,
        };

        if (nonEmptyNames.size === 1) {
            const name = [...nonEmptyNames][0];
            candidates.push(
                withPrior(
                    {
                        ...base,
                        classification: "same-name",
                        addressMatch,
                        why: `all ${members.length} orgs normalize to the same name "${name}"`,
                        action: "merge",
                        keep: suggestedKeep,
                        drops: memberIds.filter(id => id !== suggestedKeep),
                        needsReview: true,
                    },
                    priorCandidate
                )
            );
        } else if (addressMatch) {
            candidates.push(
                withPrior(
                    {
                        ...base,
                        classification: "shared-identifier",
                        addressMatch: true,
                        why: `names differ but at least two orgs share an address; identifiers shared: ${[...matched].join(", ")}`,
                        action: "skip",
                        keep: suggestedKeep,
                        drops: memberIds.filter(id => id !== suggestedKeep),
                        needsReview: true,
                    },
                    priorCandidate
                )
            );
        } else {
            // No automatic merge signal - but keep a group as a candidate when a
            // prior run already promoted/decided it (manual edits and --promote
            // must survive re-detection).
            const priorCandidate = priorBySignature.get(signature(memberIds));
            if (priorCandidate) {
                candidates.push(
                    withPrior(
                        {
                            ...base,
                            classification: "shared-identifier",
                            addressMatch: false,
                            why: `carried forward from a previous decision; identifiers shared: ${[...matched].join(", ")}`,
                            action: "skip",
                            keep: suggestedKeep,
                            drops: memberIds.filter(id => id !== suggestedKeep),
                            needsReview: true,
                        },
                        priorCandidate
                    )
                );
            } else {
                pollution.push({
                    orgs: members.map(o => ({ id: o.id, name: o.name, pan: o.pan })),
                    matchedOn: [...matched].sort(),
                    why: `identifier(s) ${[...matched].join(", ")} shared by ${members.length} companies with different names and no address agreement - do NOT merge; fix the vendor master instead`,
                });
            }
        }
    }

    const plan: PlanFile = {
        _instructions: INSTRUCTIONS,
        generatedAt: new Date().toISOString(),
        candidates: candidates.sort((a, b) => Math.min(...a.orgs.map(o => o.id)) - Math.min(...b.orgs.map(o => o.id))),
        pollution,
    };
    return plan;
}

function keysOfGroup(memberIds: number[], keyMembers: Map<string, number[]>): string[] {
    const memberSet = new Set(memberIds);
    const keys: string[] = [];
    for (const [key, ids] of keyMembers) {
        // only keys that actually connect 2+ members of this group count as a match
        if (ids.filter(id => memberSet.has(id)).length > 1) keys.push(key);
    }
    return keys;
}

function pickKeeper(members: OrgDetail[]): number {
    const score = (o: OrgDetail): number => (o.pan ? 6 : 0) + o.gsts * 2 + o.poRefs * 3 + o.vwoRefs * 3 + o.contacts + o.banks + o.files + o.rfqRefs + o.projectRefs;
    return [...members].sort((a, b) => score(b) - score(a) || (a.createdAt < b.createdAt ? -1 : a.createdAt > b.createdAt ? 1 : 0) || a.id - b.id)[0].id;
}

function signature(ids: number[]): string {
    return "g:" + [...ids].sort((a, b) => a - b).join("-");
}

function withPrior(fresh: Candidate, prior?: Candidate): Candidate {
    if (!prior) return fresh;
    // only carry decisions forward when they still make sense for this membership
    if (prior.action !== "merge" && prior.action !== "skip") return fresh;
    const memberIds = new Set(fresh.orgs.map(o => o.id));
    const keep = Number(prior.keep);
    if (!Number.isFinite(keep) || !memberIds.has(keep)) return fresh;
    const drops = (prior.drops ?? []).map(Number).filter(d => Number.isFinite(d) && memberIds.has(d) && d !== keep);
    return {
        ...fresh,
        action: prior.action,
        keep,
        drops,
        needsReview: prior.needsReview,
    };
}

function loadPlan(filePath: string): PlanFile | null {
    if (!fs.existsSync(filePath)) return null;
    return JSON.parse(fs.readFileSync(filePath, "utf8")) as PlanFile;
}

// --------------------------------------------------------------- promotions ---

/**
 * Moves the pollution groups listed in the promotions file into `candidates`
 * with action=merge. The promotions file IS the review record: keep/drops
 * there are treated as decided (needsReview=false).
 *
 * Matching: the spec's orgIds may be the EXACT member set of a pollution
 * group, or a STRICT SUBSET of one - in the subset case the group is split:
 * the promoted members become a candidate and the remaining members (e.g. a
 * mis-attached third-party GST row) stay in pollution.
 *
 * A spec that matches nothing is reported - a miss usually means the ids come
 * from a different environment or the group was already handled.
 */
function applyPromotions(plan: PlanFile, promotions: PromotionSpec[]): void {
    const idsOf = (orgs: { id: number }[]): Set<number> => new Set(orgs.map(o => Number(o.id)));
    const matches = (spec: Set<number>, group: Set<number>): "exact" | "subset" | "none" =>
        spec.size === group.size && [...spec].every(id => group.has(id)) ? "exact" : [...spec].every(id => group.has(id)) ? "subset" : "none";

    const buildCandidate = (memberOrgs: PollutionGroup["orgs"], spec: PromotionSpec, why: string): Candidate => {
        const keep = Number(spec.keep);
        const drops = (spec.drops ?? memberOrgs.map(o => Number(o.id)).filter(id => id !== keep)).map(Number);
        const orgs: OrgDetail[] = memberOrgs.map(o => ({
            id: Number(o.id),
            name: o.name,
            pan: o.pan,
            address: null,
            status: true,
            createdAt: "",
            gsts: 0,
            contacts: 0,
            banks: 0,
            files: 0,
            poRefs: 0,
            vwoRefs: 0,
            rfqRefs: 0,
            projectRefs: 0,
        }));
        return {
            key: `promoted:${orgs
                .map(o => o.id)
                .sort((a, b) => a - b)
                .join("-")}`,
            classification: "shared-identifier",
            addressMatch: false,
            matchedOn: [],
            orgs,
            suggestedKeep: keep,
            why,
            action: "merge",
            keep,
            drops,
            needsReview: false,
        };
    };

    for (const spec of promotions) {
        const want = idsOf(spec.orgIds.map(id => ({ id })));
        if (want.size === 0 || !Number.isFinite(spec.keep) || !want.has(Number(spec.keep))) {
            check(`promotion [${spec.orgIds.join(", ")}] has keep inside orgIds`, false, `keep=${spec.keep}`);
            continue;
        }

        // 1. exact match in pollution
        let idx = plan.pollution.findIndex(g => matches(want, idsOf(g.orgs)) === "exact");
        if (idx >= 0) {
            const grp = plan.pollution.splice(idx, 1)[0];
            plan.candidates.push(buildCandidate(grp.orgs, spec, spec.why ? `promoted from pollution: ${spec.why}` : `promoted from pollution: ${grp.why}`));
            console.log(`PROMOTE  orgs [${spec.orgIds.join(", ")}] -> candidate keep #${spec.keep}`);
            continue;
        }

        // 2. already promoted/decided in an earlier run
        const asCandidate = plan.candidates.find(c => matches(want, idsOf(c.orgs)) === "exact");
        if (asCandidate) {
            console.log(`PROMOTE  orgs [${spec.orgIds.join(", ")}] already a candidate (${asCandidate.key}) - keeping existing decision`);
            continue;
        }

        // 3. strict subset of a pollution group -> split the group
        idx = plan.pollution.findIndex(g => matches(want, idsOf(g.orgs)) === "subset");
        if (idx >= 0) {
            const grp = plan.pollution[idx];
            const subset = grp.orgs.filter(o => want.has(Number(o.id)));
            const remainder = grp.orgs.filter(o => !want.has(Number(o.id)));
            if (remainder.length >= 2) plan.pollution[idx] = { ...grp, orgs: remainder };
            else plan.pollution.splice(idx, 1); // a lone leftover shares nothing with anyone
            plan.candidates.push(
                buildCandidate(
                    subset,
                    spec,
                    spec.why ? `promoted from pollution (split from [${grp.orgs.map(o => o.id).join(",")}]): ${spec.why}` : `promoted from pollution (split): ${grp.why}`
                )
            );
            console.log(
                `PROMOTE  orgs [${spec.orgIds.join(", ")}] -> candidate keep #${spec.keep}  (split off pollution group [${grp.orgs.map(o => o.id).join(", ")}]; leftovers stay pollution)`
            );
            continue;
        }

        check(`promotion [${spec.orgIds.join(", ")}] found in pollution`, false, "no matching pollution group (exact or subset) - wrong environment ids or already merged?");
    }
}

// ---------------------------------------------------------------- validate ---

function validatePlan(plan: PlanFile): boolean {
    const ok = check(
        "plan has candidates or pollution entries",
        plan.candidates.length + plan.pollution.length > 0 || true,
        `${plan.candidates.length} candidate(s), ${plan.pollution.length} pollution group(s)`
    );
    const droppedEverywhere = new Map<number, string>();
    let localOk = true;

    for (const c of plan.candidates) {
        const ids = new Set(c.orgs.map(o => o.id));
        if (!ids.has(c.keep)) {
            check(`candidate ${c.key}: keep #${c.keep} is a member`, false, `members: ${[...ids].join(", ")}`);
            localOk = false;
            continue;
        }
        for (const d of c.drops) {
            if (!ids.has(d)) {
                check(`candidate ${c.key}: drop #${d} is a member`, false);
                localOk = false;
            }
            if (d === c.keep) {
                check(`candidate ${c.key}: drop #${d} differs from keep`, false);
                localOk = false;
            }
            const prior = droppedEverywhere.get(d);
            if (prior) {
                check(`candidate ${c.key}: drop #${d} not dropped by another candidate`, false, `also dropped by ${prior}`);
                localOk = false;
            }
            droppedEverywhere.set(d, c.key);
            const keptElsewhere = plan.candidates.find(o => o.key !== c.key && o.keep === d);
            if (keptElsewhere) {
                check(`candidate ${c.key}: drop #${d} is not a keep elsewhere`, false, `kept by ${keptElsewhere.key}`);
                localOk = false;
            }
        }
    }
    return ok && localOk;
}

// ---------------------------------------------------------------- dry run ---

async function reportCandidate(db: Executor, c: Candidate): Promise<void> {
    const tag = c.classification === "same-name" ? "SAME-NAME" : "SHARED-ID ";
    const state = c.needsReview ? "NEEDS REVIEW" : c.action === "merge" ? "ready" : "skip";
    console.log(`\n${tag}  ${c.key}   [${state}]   (${c.why})`);
    for (const o of c.orgs) {
        const marker = o.id === c.keep ? "-> keep" : c.drops.includes(o.id) ? "-> drop" : "        ";
        console.log(
            `  ${marker} #${o.id} ${quote(o.name)}  pan=${o.pan || "-"}  gsts=${o.gsts} refs=po:${o.poRefs} vwo:${o.vwoRefs} contacts:${o.contacts} banks:${o.banks}${o.status ? "" : "  [INACTIVE]"}`
        );
    }
    if (c.action !== "merge" || c.needsReview) return;

    const dropOrgs = c.drops.map(id => orgRow(db, id));
    const resolved = await Promise.all(dropOrgs);
    for (const drop of resolved) {
        if (!drop) {
            check(`candidate ${c.key}: drop org exists`, false, "missing");
            continue;
        }
        console.log(`  refs to re-point from #${drop.id}:`);
        let any = false;
        for (const ref of REF_COLUMNS) {
            const n = await countRefs(db, ref, drop.id);
            if (n > 0) {
                console.log(`           ${ref.table}.${ref.column}  ${n} row(s)`);
                any = true;
            }
        }
        if (!any) console.log("           (nothing points at the dropped row)");
    }
}

async function orgRow(db: Executor, id: number): Promise<{ id: number } | undefined> {
    const r = await rows<{ id: number }>(db, sql`select id from vendor_organizations where id = ${id}`);
    return r[0];
}

async function countRefs(db: Executor, ref: RefColumn, orgId: number): Promise<number> {
    const r = await rows<{ n: number }>(db, sql`select count(*)::int n from ${ident(ref.table)} where ${ident(ref.column)} = ${orgId}`);
    return Number(r[0]?.n ?? 0);
}

async function idsReferring(db: Executor, ref: RefColumn, orgId: number): Promise<number[]> {
    const r = await rows<{ id: number | string }>(db, sql`select id::int as id from ${ident(ref.table)} where ${ident(ref.column)} = ${orgId}`);
    return r.map(x => Number(x.id));
}

// ------------------------------------------------------------------ apply ---

interface DropOrgRow {
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

async function applyDrop(db: import("../src/db").DbInstance, keepId: number, dropId: number, why: string, log: (s: string) => void): Promise<void> {
    const keep = (
        await rows<DropOrgRow>(
            db,
            sql`select id, name, alias, address, pan, msme, msme_type, status, created_at, updated_at
                from vendor_organizations where id = ${keepId}`
        )
    )[0];
    const drop = (
        await rows<DropOrgRow>(
            db,
            sql`select id, name, alias, address, pan, msme, msme_type, status, created_at, updated_at
                from vendor_organizations where id = ${dropId}`
        )
    )[0];
    if (!keep || !drop) return;

    const moved: Record<string, number[]> = {};
    const filled: Record<string, unknown> = {};

    await db.transaction(async tx => {
        const txdb = tx as unknown as Executor;

        for (const col of FILL_COLUMNS) {
            if (isEmpty(keep[col]) && !isEmpty(drop[col])) filled[col] = drop[col];
        }
        for (const ref of REF_COLUMNS) {
            const ids = await idsReferring(txdb, ref, dropId);
            if (ids.length > 0) moved[`${ref.table}.${ref.column}`] = ids;
        }

        await tx.execute(sql`
            insert into vendor_organizations_dups_archive
                (id, kept_id, name, alias, address, pan, msme, msme_type, status,
                 created_at, updated_at, reason, moved_refs, filled)
            values (${drop.id}, ${keep.id}, ${drop.name}, ${drop.alias}, ${drop.address}, ${drop.pan},
                    ${drop.msme}, ${drop.msme_type}, ${drop.status}, ${drop.created_at}, ${drop.updated_at},
                    ${why}, ${JSON.stringify(moved)}, ${JSON.stringify(filled)})
            on conflict (id) do update set kept_id = excluded.kept_id, reason = excluded.reason,
                moved_refs = excluded.moved_refs, filled = excluded.filled`);

        for (const col of Object.keys(filled)) {
            await tx.execute(sql`update vendor_organizations set ${ident(col)} = ${drop[col as keyof DropOrgRow]} where id = ${keep.id}`);
        }

        for (const ref of REF_COLUMNS) {
            if (!moved[`${ref.table}.${ref.column}`]) continue;
            await tx.execute(sql`update ${ident(ref.table)} set ${ident(ref.column)} = ${keep.id} where ${ident(ref.column)} = ${dropId}`);
        }

        const orphans: string[] = [];
        for (const ref of REF_COLUMNS) {
            const n = await countRefs(txdb, ref, dropId);
            if (n > 0) orphans.push(`${ref.table}.${ref.column}=${n}`);
        }
        if (orphans.length > 0) throw new Error(`org ${dropId} still referenced after move: ${orphans.join(", ")}`);

        // never DELETE the duplicate - deactivate it so the row (and its id) survive
        await tx.execute(sql`update vendor_organizations set status = false where id = ${dropId}`);
    });

    const movedSummary =
        Object.keys(moved).length === 0
            ? "(no references)"
            : Object.entries(moved)
                  .map(([k, ids]) => `${k}: ${ids.length} row(s)`)
                  .join("; ");
    log(`merged org ${dropId} -> ${keep.id} (deactivated ${dropId}): filled=[${Object.keys(filled).join(", ") || "-"}] moved=${movedSummary}`);
    console.log(`  merged #${dropId} -> #${keep.id} (deactivated #${dropId})   filled: ${Object.keys(filled).join(", ") || "(none)"}   moved: ${movedSummary}`);
}

// --------------------------------------------------------------- rollback ---

async function rollback(db: import("../src/db").DbInstance, log: (s: string) => void): Promise<void> {
    const archived = await rows<ArchiveRow>(db, sql`select * from vendor_organizations_dups_archive order by archived_at desc, id desc`);
    if (archived.length === 0) {
        console.log("Nothing in vendor_organizations_dups_archive - nothing to roll back.");
        return;
    }
    for (const rec of archived) {
        const exists = Boolean(await orgRow(db, rec.id));
        await db.transaction(async tx => {
            if (exists) {
                // merge was applied as a deactivation - bring the row back
                await tx.execute(sql`update vendor_organizations set status = coalesce(${rec.status}, true) where id = ${rec.id}`);
            } else {
                // legacy merge actually deleted the row - re-insert it
                await tx.execute(sql`
                    insert into vendor_organizations
                        (id, name, alias, address, pan, msme, msme_type, status, created_at, updated_at)
                    values (${rec.id}, ${rec.name}, ${rec.alias}, ${rec.address}, ${rec.pan},
                            ${rec.msme}, ${rec.msme_type}, coalesce(${rec.status}, true),
                            ${rec.created_at}, ${rec.updated_at})`);
            }

            const moved = rec.moved_refs ?? {};
            for (const [key, ids] of Object.entries(moved)) {
                const dot = key.lastIndexOf(".");
                const table = key.slice(0, dot);
                const column = key.slice(dot + 1);
                if (ids.length === 0) continue;
                await tx.execute(
                    sql`update ${ident(table)} set ${ident(column)} = ${rec.id}
                        where id in (${sql.join(
                            ids.map(id => sql`${id}`),
                            sql`, `
                        )})`
                );
            }
            for (const [col, value] of Object.entries(rec.filled ?? {})) {
                await tx.execute(sql`update vendor_organizations set ${ident(col)} = null where id = ${rec.kept_id} and ${ident(col)} = ${String(value)}`);
            }
            await tx.execute(sql`delete from vendor_organizations_dups_archive where id = ${rec.id}`);
        });
        log(`rolled back merge of org ${rec.id} (${exists ? "reactivated" : "restored from archive"}, was merged into ${rec.kept_id})`);
        console.log(`  ${exists ? "reactivated" : "restored"} org ${rec.id} (was merged into ${rec.kept_id})`);
    }
}

// ------------------------------------------------------------------- main ---

async function main(): Promise<void> {
    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl) {
        console.error("DATABASE_URL not set - set it in the environment or api/.env.");
        process.exit(1);
    }
    const pool = createPool(dbUrl, 4, process.env.PGSSL === "true");
    const db = createDb(pool) as unknown as Executor & import("../src/db").DbInstance;

    const mode = ROLLBACK ? "ROLLBACK" : DETECT ? "DETECT" : APPLY ? "APPLY" : "DRY RUN";
    console.log(`\nvendor_organizations merge — ${mode}${DETECT || !APPLY ? "" : " (plan: " + PLAN_PATH + ")"}\n`);

    try {
        if (DETECT) {
            const plan = await detect(db);
            fs.writeFileSync(PLAN_PATH, JSON.stringify(plan, null, 2) + "\n");
            console.log(`Wrote ${PLAN_PATH}`);
            console.log(
                `  candidates: ${plan.candidates.length}  (same-name ${plan.candidates.filter(c => c.classification === "same-name").length}, shared-identifier ${plan.candidates.filter(c => c.classification === "shared-identifier").length})`
            );
            console.log(`  pollution:  ${plan.pollution.length} group(s) - report only, not merged`);
            for (const p of plan.pollution) {
                console.log(`    ${p.matchedOn.join("+")}: ${p.orgs.map(o => `#${o.id} ${quote(o.name)}`).join("  |  ")}`);
            }
            console.log(`\nReview the plan file, then: pnpm merge:vendor-orgs  (dry run) / --apply`);
            return;
        }

        if (ROLLBACK) {
            const logger = new MigrationLogger("./migration-logs", "vendor-orgs-rollback");
            await rollback(db, s => logger.log(s));
            logger.summary("Rollback complete.");
            return;
        }

        const plan = loadPlan(PLAN_PATH);
        if (!plan) {
            console.error(`No plan file at ${PLAN_PATH} - run with --detect first.`);
            process.exit(1);
        }

        if (PROMOTE) {
            if (!fs.existsSync(PROMOTIONS_PATH)) {
                console.error(`No promotions file at ${PROMOTIONS_PATH} - create it (see _instructions in the plan file).`);
                process.exit(1);
            }
            const promoFile = JSON.parse(fs.readFileSync(PROMOTIONS_PATH, "utf8")) as PromotionsFile;
            console.log(`Promoting from ${PROMOTIONS_PATH} (${promoFile.promotions?.length ?? 0} entr(y/ies)):\n`);
            applyPromotions(plan, promoFile.promotions ?? []);
            // persist so subsequent dry-run/--apply runs keep the promotions
            fs.writeFileSync(PLAN_PATH, JSON.stringify(plan, null, 2) + "\n");
            console.log(`\nSaved updated plan to ${PLAN_PATH}\n`);
        }

        validatePlan(plan);

        const unreviewed = plan.candidates.filter(c => c.needsReview);
        if (unreviewed.length > 0) {
            console.log(`\n${unreviewed.length} candidate(s) still need a decision in ${PLAN_PATH}:`);
            for (const c of unreviewed) console.log(`  ${c.key}  ${c.orgs.map(o => `#${o.id} ${quote(o.name)}`).join(" | ")}`);
        }

        for (const c of plan.candidates) await reportCandidate(db, c);

        const toMerge = plan.candidates.filter(c => c.action === "merge" && !c.needsReview);
        console.log(
            `\nReady to merge: ${toMerge.length} group(s), ${toMerge.reduce((n, c) => n + c.drops.length, 0)} drop(s). Pollution groups: ${plan.pollution.length} (untouched).`
        );

        if (!APPLY) {
            if (failures.length > 0) {
                console.log(`\n${failures.length} validation failure(s) - fix the plan file first.`);
                process.exit(2);
            }
            console.log("Dry run only - re-run with --apply to write.");
            return;
        }

        if (failures.length > 0) {
            console.error(`\nAborting: ${failures.length} validation failure(s).`);
            process.exit(2);
        }
        if (unreviewed.length > 0 && !ALLOW_UNREVIEWED) {
            console.error(`\nAborting: ${unreviewed.length} candidate(s) still need a decision.`);
            console.error(`Edit ${PLAN_PATH} (set needsReview false), then re-run, or pass --allow-unreviewed.`);
            process.exit(2);
        }

        const logger = new MigrationLogger("./migration-logs", "vendor-orgs");
        logger.log(`Applying ${toMerge.length} merge group(s) from ${PLAN_PATH}`);
        console.log("\nApplying:\n");
        for (const c of toMerge) {
            for (const dropId of c.drops) {
                await applyDrop(db, c.keep, dropId, `${c.key}: ${c.why}`, s => logger.log(s));
            }
        }
        const summary = `Merged and deactivated ${toMerge.reduce((n, c) => n + c.drops.length, 0)} duplicate org(s) into keepers across ${toMerge.length} group(s). No rows were deleted.`;
        console.log(`\n${summary}`);
        logger.summary(summary);

        const dupes = await rows<{ k: string; ids: number[] }>(
            db,
            sql`select lower(btrim(name)) k, array_agg(id order by id) ids
                from vendor_organizations
                where status and btrim(coalesce(name, '')) <> ''
                group by 1 having count(*) > 1 order by 1`
        );
        console.log(`Duplicate normalized-name groups left: ${dupes.length}`);
        check("no duplicate vendor-master names remain", dupes.length === 0, `${dupes.length} group(s)`);
        if (failures.length > 0) process.exit(3);
    } finally {
        await pool.end();
    }
}

main().catch(err => {
    console.error("Merge failed:", err);
    process.exit(1);
});
