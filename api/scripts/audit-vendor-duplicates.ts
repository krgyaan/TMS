/**
 * Read-only vendor duplicate audit.
 *
 * Finds name variants, proposes the lowest id as keeper, and separately logs
 * same-PAN / same-GSTIN groups whose names are genuinely different.
 *
 * Usage (from api/):
 *   pnpm audit:vendor-duplicates
 *
 * Outputs to ./migration-logs/:
 *   vendor-name-variants-<runId>.csv
 *   vendor-name-variants-<runId>.ndjson
 *   vendor-name-review-<runId>.csv
 *   vendor-different-name-matches-<runId>.csv
 *   vendor-name-merge-plan-<runId>.json
 */
import "dotenv/config";
import * as fs from "fs";
import * as path from "path";
import { eq } from "drizzle-orm";
import { createPool, createDb } from "../src/db";
import { vendorOrganizations } from "../src/db/schemas/vendors/vendor-organizations.schema";
import { vendorGsts } from "../src/db/schemas/vendors/vendor-gsts.schema";
import { vendorAccs } from "../src/db/schemas/vendors/vendor-banks.schema";
import { vendors } from "../src/db/schemas/vendors/vendors.schema";

type Org = {
    id: number;
    name: string;
    pan: string | null;
    strict: string;
    loose: string;
    tokens: Set<string>;
};

type Edge = {
    a: number;
    b: number;
    confidence: "high" | "medium" | "review";
    reason: string;
    sharedPan: boolean;
    sharedGstin: boolean;
    sharedEmail: boolean;
    sharedPhone: boolean;
    sharedBank: boolean;
};

const LEGAL_SUFFIXES = [
    ["private", "limited"],
    ["pvt", "ltd"],
    ["pvt", "limited"],
    ["private", "ltd"],
    ["limited", "liability", "partnership"],
    ["llp"],
    ["limited"],
    ["ltd"],
    ["inc"],
    ["incorporated"],
    ["corporation"],
    ["corp"],
    ["company"],
    ["co"],
];

const GENERIC_TOKENS = new Set([
    "india",
    "indian",
    "international",
    "the",
    "and",
    "of",
    "group",
    "solutions",
    "solution",
    "services",
    "service",
    "enterprises",
    "enterprise",
    "industries",
    "industry",
    "trading",
    "associates",
    "engineering",
    "electricals",
    "technology",
    "technologies",
    "ji",
    "shri",
    "sri",
    "mr",
    "mrs",
]);

const normalizePan = (value: string | null): string | null => {
    const cleaned = (value ?? "").toUpperCase().replace(/[^A-Z0-9]/g, "");
    return cleaned || null;
};

const stripSuffixes = (words: string[]): string[] => {
    let changed = true;
    while (changed) {
        changed = false;
        for (const suffix of LEGAL_SUFFIXES) {
            if (words.length > suffix.length && suffix.every((word, index) => words[words.length - suffix.length + index] === word)) {
                words.splice(words.length - suffix.length);
                changed = true;
            }
        }
    }
    return words;
};

const strictName = (name: string): string => {
    const words = name
        .toLowerCase()
        .replace(/&/g, " and ")
        .replace(/m\s*\/\s*s/g, " ")
        .replace(/[^a-z0-9]+/g, " ")
        .trim()
        .split(" ")
        .filter(Boolean);
    return stripSuffixes(words).join(" ");
};

const looseName = (name: string): string =>
    strictName(name)
        .split(" ")
        .filter(word => !GENERIC_TOKENS.has(word))
        .join(" ");

const levenshtein = (a: string, b: string): number => {
    if (a === b) return 0;
    if (!a.length) return b.length;
    if (!b.length) return a.length;

    const previous = Array.from({ length: b.length + 1 }, (_, i) => i);
    const current = new Array<number>(b.length + 1);

    for (let i = 1; i <= a.length; i++) {
        current[0] = i;
        for (let j = 1; j <= b.length; j++) {
            const cost = a[i - 1] === b[j - 1] ? 0 : 1;
            current[j] = Math.min(current[j - 1] + 1, previous[j] + 1, previous[j - 1] + cost);
        }
        for (let j = 0; j <= b.length; j++) previous[j] = current[j];
    }

    return previous[b.length];
};

const jaccard = (a: Set<string>, b: Set<string>): number => {
    if (!a.size || !b.size) return 0;
    let intersection = 0;
    for (const value of a) if (b.has(value)) intersection++;
    return intersection / (a.size + b.size - intersection);
};

const csvEscape = (value: unknown): string => {
    const text = value === null || value === undefined ? "" : String(value);
    return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

const writeCsv = (filePath: string, columns: string[], rows: Array<Record<string, unknown>>): void => {
    const lines = [columns.join(",")];
    for (const row of rows) lines.push(columns.map(column => csvEscape(row[column])).join(","));
    fs.writeFileSync(filePath, lines.join("\n") + "\n");
};

class UnionFind {
    private readonly parent = new Map<number, number>();

    add(id: number): void {
        if (!this.parent.has(id)) this.parent.set(id, id);
    }

    find(id: number): number {
        const parent = this.parent.get(id) ?? id;
        if (parent === id) return id;
        const root = this.find(parent);
        this.parent.set(id, root);
        return root;
    }

    union(a: number, b: number): void {
        this.add(a);
        this.add(b);
        const rootA = this.find(a);
        const rootB = this.find(b);
        if (rootA !== rootB) this.parent.set(rootB, rootA);
    }
}

async function main() {
    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl) {
        console.error("DATABASE_URL not set - set it in the environment or api/.env.");
        process.exit(1);
    }

    const pool = createPool(dbUrl, 2, process.env.PGSSL === "true");
    const db = createDb(pool);
    const outDir = "./migration-logs";
    fs.mkdirSync(outDir, { recursive: true });
    const runId = new Date().toISOString().replace(/[:.]/g, "-");

    try {
        const orgRows = await db
            .select({ id: vendorOrganizations.id, name: vendorOrganizations.name, pan: vendorOrganizations.pan })
            .from(vendorOrganizations)
            .where(eq(vendorOrganizations.status, true));
        const gstRows = await db.select({ orgId: vendorGsts.orgId, gstNo: vendorGsts.gstNo }).from(vendorGsts);
        const accountRows = await db.select({ orgId: vendorAccs.orgId, accountNum: vendorAccs.accountNum }).from(vendorAccs);
        const contactRows = await db.select({ orgId: vendors.orgId, email: vendors.email, mobile: vendors.mobile }).from(vendors);

        const orgs: Org[] = orgRows.map(row => {
            const strict = strictName(row.name);
            return {
                id: row.id,
                name: row.name,
                pan: normalizePan(row.pan),
                strict,
                loose: looseName(row.name),
                tokens: new Set(strict.split(" ").filter(Boolean)),
            };
        });
        const orgById = new Map(orgs.map(org => [org.id, org]));

        const gstsByOrg = new Map<number, string[]>();
        for (const row of gstRows) {
            if (!row.gstNo) continue;
            const key = row.orgId;
            const list = gstsByOrg.get(key) ?? [];
            list.push(row.gstNo.toUpperCase());
            gstsByOrg.set(key, list);
        }

        const accountsByOrg = new Map<number, string[]>();
        for (const row of accountRows) {
            const key = row.orgId;
            const list = accountsByOrg.get(key) ?? [];
            list.push((row.accountNum ?? "").trim().toLowerCase());
            accountsByOrg.set(key, list);
        }

        const emailsByOrg = new Map<number, string[]>();
        const phonesByOrg = new Map<number, string[]>();
        for (const row of contactRows) {
            if (row.orgId == null) continue;
            if (row.email) {
                const list = emailsByOrg.get(row.orgId) ?? [];
                for (const email of row.email.split(",").map(value => value.trim().toLowerCase()).filter(Boolean)) list.push(email);
                emailsByOrg.set(row.orgId, list);
            }
            if (row.mobile) {
                const list = phonesByOrg.get(row.orgId) ?? [];
                list.push(row.mobile.replace(/\D/g, "").slice(-10));
                phonesByOrg.set(row.orgId, list);
            }
        }

        const shared = (a: number, b: number, map: Map<number, string[]>): boolean => {
            const left = map.get(a) ?? [];
            const right = new Set(map.get(b) ?? []);
            return left.some(value => right.has(value));
        };

        const edges: Edge[] = [];
        const reviewPairs: Edge[] = [];

        for (let i = 0; i < orgs.length; i++) {
            for (let j = i + 1; j < orgs.length; j++) {
                const a = orgs[i];
                const b = orgs[j];
                if (a.pan && b.pan && a.pan !== b.pan) continue;

                const sharedPan = !!a.pan && a.pan === b.pan;
                const sharedGstin = (gstsByOrg.get(a.id) ?? []).some(value => (gstsByOrg.get(b.id) ?? []).includes(value));
                const sharedEmail = shared(a.id, b.id, emailsByOrg);
                const sharedPhone = shared(a.id, b.id, phonesByOrg);
                const sharedBank = shared(a.id, b.id, accountsByOrg);

                let confidence: Edge["confidence"] | null = null;
                let reason = "";

                if (a.strict === b.strict) {
                    confidence = "high";
                    reason = "same strict normalized name";
                } else {
                    const aWords = a.strict.split(" ").filter(Boolean);
                    const bWords = b.strict.split(" ").filter(Boolean);
                    const [shortWords, longWords] = aWords.length <= bWords.length ? [aWords, bWords] : [bWords, aWords];

                    if (shortWords.length && shortWords.every((word, index) => longWords[index] === word)) {
                        const extra = longWords.slice(shortWords.length);
                        if (extra.every(word => GENERIC_TOKENS.has(word))) {
                            confidence = "high";
                            reason = `prefix variant (extra: ${extra.join(" ")})`;
                        } else {
                            confidence = "review";
                            reason = `prefix variant with extra tokens: ${extra.join(" ")}`;
                        }
                    } else {
                        const tokenSimilarity = jaccard(a.tokens, b.tokens);
                        const maxLength = Math.max(a.strict.length, b.strict.length);
                        const charSimilarity = maxLength ? 1 - levenshtein(a.strict, b.strict) / maxLength : 1;

                        if (tokenSimilarity >= 0.8 || charSimilarity >= 0.86) {
                            confidence = tokenSimilarity >= 0.9 || charSimilarity >= 0.92 ? "high" : "medium";
                            reason = `similar name (tokens ${tokenSimilarity.toFixed(2)}, chars ${charSimilarity.toFixed(2)})`;
                        }
                    }
                }

                if (!confidence) continue;

                const edge: Edge = {
                    a: a.id,
                    b: b.id,
                    confidence,
                    reason,
                    sharedPan,
                    sharedGstin,
                    sharedEmail,
                    sharedPhone,
                    sharedBank,
                };

                if (confidence === "review") reviewPairs.push(edge);
                else edges.push(edge);
            }
        }

        const uf = new UnionFind();
        for (const org of orgs) uf.add(org.id);
        for (const edge of edges) uf.union(edge.a, edge.b);

        const clusterMap = new Map<number, number[]>();
        for (const edge of edges) {
            for (const id of [edge.a, edge.b]) {
                const root = uf.find(id);
                const list = clusterMap.get(root) ?? [];
                if (!list.includes(id)) list.push(id);
                clusterMap.set(root, list);
            }
        }

        const clusters = [...clusterMap.values()]
            .filter(ids => ids.length > 1)
            .map((ids, index) => {
                const sorted = [...ids].sort((a, b) => a - b);
                const clusterEdges = edges.filter(edge => ids.includes(edge.a) && ids.includes(edge.b));
                const confidence: "high" | "medium" = clusterEdges.some(edge => edge.confidence === "high") ? "high" : "medium";
                const names = sorted.map(id => orgById.get(id)?.name ?? `#${id}`);
                return {
                    cluster: index + 1,
                    keepId: sorted[0],
                    keepName: names[0],
                    dropIds: sorted.slice(1),
                    dropNames: names.slice(1),
                    confidence,
                    reasons: [...new Set(clusterEdges.map(edge => edge.reason))],
                    sharedPan: clusterEdges.some(edge => edge.sharedPan),
                    sharedGstin: clusterEdges.some(edge => edge.sharedGstin),
                    sharedEmail: clusterEdges.some(edge => edge.sharedEmail),
                    sharedPhone: clusterEdges.some(edge => edge.sharedPhone),
                    sharedBank: clusterEdges.some(edge => edge.sharedBank),
                    gstCounts: sorted.map(id => `${id}:${(gstsByOrg.get(id) ?? []).length}`).join(" | "),
                    accountCounts: sorted.map(id => `${id}:${(accountsByOrg.get(id) ?? []).length}`).join(" | "),
                    emailCounts: sorted.map(id => `${id}:${(emailsByOrg.get(id) ?? []).length}`).join(" | "),
                };
            })
            .sort((a, b) => a.keepId - b.keepId);

        const clusterIds = new Map<number, number>();
        for (const cluster of clusters) for (const id of [cluster.keepId, ...cluster.dropIds]) clusterIds.set(id, cluster.cluster);

        const variantRows = clusters.map(cluster => ({
            cluster: cluster.cluster,
            confidence: cluster.confidence,
            keep_id: cluster.keepId,
            keep_name: cluster.keepName,
            drop_ids: cluster.dropIds.join(", "),
            drop_names: cluster.dropNames.join(" | "),
            reasons: cluster.reasons.join(" | "),
            shared_pan: cluster.sharedPan,
            shared_gstin: cluster.sharedGstin,
            shared_email: cluster.sharedEmail,
            shared_phone: cluster.sharedPhone,
            shared_bank: cluster.sharedBank,
            gst_counts: cluster.gstCounts,
            account_counts: cluster.accountCounts,
            email_counts: cluster.emailCounts,
        }));

        const reviewRows = reviewPairs.map(edge => ({
            a_id: edge.a,
            a_name: orgById.get(edge.a)?.name ?? "",
            b_id: edge.b,
            b_name: orgById.get(edge.b)?.name ?? "",
            reason: edge.reason,
            shared_pan: edge.sharedPan,
            shared_gstin: edge.sharedGstin,
            shared_email: edge.sharedEmail,
            shared_phone: edge.sharedPhone,
            shared_bank: edge.sharedBank,
        }));

        const samePan = new Map<string, number[]>();
        for (const org of orgs) {
            if (!org.pan) continue;
            const list = samePan.get(org.pan) ?? [];
            list.push(org.id);
            samePan.set(org.pan, list);
        }

        const sameGstin = new Map<string, number[]>();
        for (const [orgId, values] of gstsByOrg) {
            for (const value of values) {
                const list = sameGstin.get(value) ?? [];
                if (!list.includes(orgId)) list.push(orgId);
                sameGstin.set(value, list);
            }
        }

        const differentNameRows: Array<Record<string, unknown>> = [];
        for (const [pan, ids] of samePan) {
            if (ids.length < 2) continue;
            const clusterSet = new Set(ids.map(id => clusterIds.get(id)).filter(Boolean));
            if (clusterSet.size <= 1 && ids.every(id => clusterIds.has(id))) continue;
            differentNameRows.push({
                evidence: "same PAN",
                key: pan,
                org_ids: [...ids].sort((a, b) => a - b).join(", "),
                names: [...ids].sort((a, b) => a - b).map(id => `${id}:${orgById.get(id)?.name ?? ""}`).join(" | "),
                decision: "log-only",
            });
        }

        for (const [gstin, ids] of sameGstin) {
            if (ids.length < 2) continue;
            const clusterSet = new Set(ids.map(id => clusterIds.get(id)).filter(Boolean));
            if (clusterSet.size <= 1 && ids.every(id => clusterIds.has(id))) continue;
            differentNameRows.push({
                evidence: "shared GSTIN",
                key: gstin,
                org_ids: [...ids].sort((a, b) => a - b).join(", "),
                names: [...ids].sort((a, b) => a - b).map(id => `${id}:${orgById.get(id)?.name ?? ""}`).join(" | "),
                decision: "log-only",
            });
        }

        const plan = {
            generatedAt: new Date().toISOString(),
            source: "vendor_organizations",
            clusters: clusters.map(cluster => ({
                keepId: cluster.keepId,
                keepName: cluster.keepName,
                dropIds: cluster.dropIds,
                dropNames: cluster.dropNames,
                confidence: cluster.confidence,
                reasons: cluster.reasons,
            })),
        };

        const variantsCsv = path.join(outDir, `vendor-name-variants-${runId}.csv`);
        const variantsNdjson = path.join(outDir, `vendor-name-variants-${runId}.ndjson`);
        const reviewCsv = path.join(outDir, `vendor-name-review-${runId}.csv`);
        const differentCsv = path.join(outDir, `vendor-different-name-matches-${runId}.csv`);
        const planJson = path.join(outDir, `vendor-name-merge-plan-${runId}.json`);

        writeCsv(
            variantsCsv,
            [
                "cluster",
                "confidence",
                "keep_id",
                "keep_name",
                "drop_ids",
                "drop_names",
                "reasons",
                "shared_pan",
                "shared_gstin",
                "shared_email",
                "shared_phone",
                "shared_bank",
                "gst_counts",
                "account_counts",
                "email_counts",
            ],
            variantRows
        );
        fs.writeFileSync(variantsNdjson, variantRows.map(row => JSON.stringify(row)).join("\n") + (variantRows.length ? "\n" : ""));
        writeCsv(
            reviewCsv,
            ["a_id", "a_name", "b_id", "b_name", "reason", "shared_pan", "shared_gstin", "shared_email", "shared_phone", "shared_bank"],
            reviewRows
        );
        writeCsv(differentCsv, ["evidence", "key", "org_ids", "names", "decision"], differentNameRows);
        fs.writeFileSync(planJson, JSON.stringify(plan, null, 2) + "\n");

        console.log(`Active organizations scanned: ${orgs.length}`);
        console.log(`Name-variant merge clusters: ${clusters.length}`);
        console.log(`Name-variant drops: ${clusters.reduce((sum, cluster) => sum + cluster.dropIds.length, 0)}`);
        console.log(`Review-required similar-name pairs: ${reviewRows.length}`);
        console.log(`Same-PAN / shared-GSTIN log-only groups: ${differentNameRows.length}`);
        console.log(`\nVariants CSV:  ${variantsCsv}`);
        console.log(`Variants JSON: ${variantsNdjson}`);
        console.log(`Review CSV:    ${reviewCsv}`);
        console.log(`Log-only CSV:  ${differentCsv}`);
        console.log(`Merge plan:    ${planJson}`);
    } finally {
        await pool.end();
    }
}

main().catch(error => {
    console.error("Audit failed:", error);
    process.exit(1);
});
