/**
 * Undoes exactly the writes recorded in one migration run's manifest -
 * never touches any other row in vendor_organizations / vendors / vendor_gsts.
 *
 * Usage (from the api/ directory; DATABASE_URL is loaded from api/.env):
 *   pnpm rollback:vendor-master ./migration-logs/vendor-master-<runId>.manifest.ndjson
 *      -> dry run: prints exactly what it WOULD do, changes nothing
 *   pnpm rollback:vendor-master ./migration-logs/vendor-master-<runId>.manifest.ndjson --confirm
 *      -> actually performs the rollback
 *
 * How it decides what to do, per recorded write (processed in reverse order,
 * so GST rows and contacts are undone before the organization they belong to):
 *   - action "insert" -> DELETE the row, by id.
 *   - action "update" -> UPDATE the row back to its captured "before" values.
 *
 * Safety: each row's current `updatedAt` is compared against the value the
 * migration set at write time (`checkUpdatedAt`). If it doesn't match, some
 * other process has touched that row since the migration ran, and this
 * script skips it rather than clobbering newer data - you'll see it listed
 * under "skipped (modified since migration)" and can review it by hand.
 *
 * A manifest can only be rolled back once: on success a `.rolled-back`
 * marker file is written next to it, and the script refuses to run again
 * against the same manifest.
 */
import "dotenv/config";
import { eq } from "drizzle-orm";
import { createPool, createDb } from "../src/db";
import * as fs from "fs";
import type { ManifestEntry } from "./migrationLogger";
import * as schema from "../src/db/schemas/vendors";

const TABLES = {
    vendor_organizations: schema.vendorOrganizations,
    vendors: schema.vendors,
    vendor_gsts: schema.vendorGsts,
} as const;

function readManifest(manifestPath: string): ManifestEntry[] {
    const raw = fs.readFileSync(manifestPath, "utf8");
    return raw
        .split("\n")
        .map(l => l.trim())
        .filter(Boolean)
        .map(l => JSON.parse(l) as ManifestEntry);
}

async function main() {
    const manifestPath = process.argv.slice(2).find(a => !a.startsWith("--"));
    const confirm = process.argv.includes("--confirm");

    if (!manifestPath) {
        console.error("Usage: npx tsx scripts/rollback-vendor-master.ts <path-to-manifest.ndjson> [--confirm]");
        process.exit(1);
    }

    const markerPath = manifestPath + ".rolled-back";
    if (fs.existsSync(markerPath)) {
        console.error(`This manifest was already rolled back on ${fs.readFileSync(markerPath, "utf8").trim()}. Refusing to run again.`);
        process.exit(1);
    }

    const entries = readManifest(manifestPath).reverse(); // children (gsts/contacts) before parent (org)
    console.log(`Loaded ${entries.length} write(s) from ${manifestPath}.`);
    console.log(confirm ? "Running with --confirm: changes WILL be made.\n" : "Dry run (pass --confirm to actually apply):\n");

    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl) {
        console.error("DATABASE_URL not set - set it in the environment or api/.env.");
        process.exit(1);
    }

    const pool = createPool(dbUrl, 2, process.env.PGSSL === "true");
    const db = createDb(pool);

    let toDelete = 0;
    let toRestore = 0;
    let skippedModified = 0;
    let skippedMissing = 0;

    try {
        await db.transaction(async tx => {
            for (const entry of entries) {
                const table = TABLES[entry.table];

                const current = await tx.select().from(table).where(eq(table.id, entry.id)).limit(1);
                if (current.length === 0) {
                    console.log(` - ${entry.table} id=${entry.id}: already gone, skipping`);
                    skippedMissing++;
                    continue;
                }

                const currentUpdatedAt = (current[0] as { updatedAt: Date | null }).updatedAt;
                const currentIso = currentUpdatedAt ? new Date(currentUpdatedAt).toISOString() : null;
                if (currentIso !== entry.checkUpdatedAt) {
                    console.log(` - ${entry.table} id=${entry.id}: modified since migration (skipped - review by hand)`);
                    skippedModified++;
                    continue;
                }

                if (entry.action === "insert") {
                    console.log(` - ${entry.table} id=${entry.id}: DELETE`);
                    toDelete++;
                    if (confirm) {
                        await tx.delete(table).where(eq(table.id, entry.id));
                    }
                } else {
                    console.log(` - ${entry.table} id=${entry.id}: RESTORE previous values`);
                    toRestore++;
                    if (confirm && entry.before) {
                        await tx.update(table).set(entry.before).where(eq(table.id, entry.id));
                    }
                }
            }

            if (!confirm) {
                // Roll back the dry-run transaction itself - it only ran SELECTs, but this keeps intent explicit.
                throw new Error("__DRY_RUN__");
            }
        });
    } catch (err) {
        if (!(err instanceof Error && err.message === "__DRY_RUN__")) throw err;
    } finally {
        await pool.end();
    }

    console.log(
        `\n${confirm ? "Rollback complete" : "Dry run complete"}. ` +
            `Would delete: ${toDelete}, restore: ${toRestore}, skip (already gone): ${skippedMissing}, skip (modified since): ${skippedModified}.`
    );

    if (confirm) {
        fs.writeFileSync(markerPath, new Date().toISOString());
        console.log(`Marked ${manifestPath} as rolled back.`);
    } else {
        console.log("Nothing was changed. Re-run with --confirm to apply.");
    }
}

main().catch(err => {
    console.error("Rollback failed:", err);
    process.exit(1);
});
