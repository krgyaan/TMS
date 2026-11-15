/**
 * Apply the name-variant merge plan produced by audit-vendor-duplicates.ts.
 *
 * Usage (from api/):
 *   pnpm merge:vendor-duplicates --plan migration-logs/vendor-name-merge-plan-<runId>.json
 *   pnpm merge:vendor-duplicates --plan migration-logs/vendor-name-merge-plan-<runId>.json --apply
 *
 * Default is a dry run. With --apply, each drop is merged into its cluster's
 * lowest id using VendorMasterService.mergeVendors (same logic as the UI):
 * references are re-pointed, the drop is archived, and the drop is deactivated.
 */
import "dotenv/config";
import "reflect-metadata";
import * as fs from "fs";
import * as path from "path";
import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { NestFactory } from "@nestjs/core";
import type { Pool } from "pg";
import { DatabaseModule, DB_POOL } from "../src/db/database.module";
import { VendorMasterService } from "../src/modules/master/vendor-master/vendor-master.service";
import { ClientDirectorySyncService } from "../src/modules/shared/client-directory/client-directory-sync.service";

@Module({
    imports: [ConfigModule.forRoot({ isGlobal: true }), DatabaseModule],
    providers: [VendorMasterService, { provide: ClientDirectorySyncService, useValue: {} }],
})
class MergeVendorDuplicatesModule {}

type PlanCluster = {
    keepId: number;
    keepName: string;
    dropIds: number[];
    dropNames: string[];
    confidence: "high" | "medium";
    reasons: string[];
};

type MergePlan = {
    generatedAt: string;
    source: string;
    clusters: PlanCluster[];
};

const findLatestPlan = (): string | null => {
    const dir = "./migration-logs";
    if (!fs.existsSync(dir)) return null;
    const files = fs
        .readdirSync(dir)
        .filter(file => /^vendor-name-merge-plan-.*\.json$/.test(file))
        .map(file => ({ file, mtime: fs.statSync(path.join(dir, file)).mtimeMs }))
        .sort((a, b) => b.mtime - a.mtime);
    return files.length ? path.join(dir, files[0].file) : null;
};

const totalRefs = (preview: Awaited<ReturnType<VendorMasterService["getMergePreview"]>>): number =>
    Object.values(preview.references).reduce((sum, group) => sum + group.count, 0);

async function main() {
    const args = process.argv.slice(2);
    const planIndex = args.indexOf("--plan");
    const planPath = planIndex >= 0 ? args[planIndex + 1] : findLatestPlan();
    const apply = args.includes("--apply");

    if (!planPath) {
        console.error("No plan file found. Run `pnpm audit:vendor-duplicates` first, or pass --plan <path>.");
        process.exit(1);
    }
    if (!fs.existsSync(planPath)) {
        console.error(`Plan file not found: ${planPath}`);
        process.exit(1);
    }

    const plan = JSON.parse(fs.readFileSync(planPath, "utf8")) as MergePlan;
    if (!Array.isArray(plan.clusters)) {
        console.error("Invalid plan file: missing clusters array.");
        process.exit(1);
    }

    const runId = new Date().toISOString().replace(/[:.]/g, "-");
    fs.mkdirSync("./migration-logs", { recursive: true });
    const logPath = path.join("./migration-logs", `vendor-merge-${runId}.log.txt`);
    const log = (line: string) => {
        console.log(line);
        fs.appendFileSync(logPath, `[${new Date().toISOString()}] ${line}\n`);
    };

    log(`Plan: ${planPath}`);
    log(`Clusters: ${plan.clusters.length}`);
    log(`Mode: ${apply ? "APPLY" : "DRY RUN"}`);
    log(`Log: ${logPath}`);

    const app = await NestFactory.createApplicationContext(MergeVendorDuplicatesModule, {
        logger: ["error", "warn"],
    });
    const service = app.get(VendorMasterService);
    const pool = app.get<Pool>(DB_POOL);

    let merged = 0;
    let skipped = 0;
    let failed = 0;

    try {
        for (const cluster of plan.clusters) {
            log(`\n## Cluster keep #${cluster.keepId} "${cluster.keepName}" (${cluster.confidence})`);
            for (const dropId of cluster.dropIds) {
                try {
                    const preview = await service.getMergePreview(cluster.keepId, dropId);
                    if (!preview.drop.status) {
                        skipped++;
                        log(`SKIP #${dropId} "${preview.drop.name}" - already inactive`);
                        continue;
                    }

                    log(
                        `#${dropId} "${preview.drop.name}" -> #${cluster.keepId} "${preview.keep.name}" | ` +
                            `persons=${preview.drop._counts.persons} gsts=${preview.drop._counts.gsts} ` +
                            `accounts=${preview.drop._counts.accounts} files=${preview.drop._counts.files} ` +
                            `refs=${totalRefs(preview)}`
                    );

                    if (!apply) continue;

                    const result = await service.mergeVendors(cluster.keepId, dropId);
                    const moved = Object.values(result.movedRefs).reduce((sum, ids) => sum + ids.length, 0);
                    merged++;
                    log(`MERGED #${dropId} into #${cluster.keepId}; moved ${moved} reference row(s)`);
                } catch (error) {
                    failed++;
                    log(`FAILED #${dropId} -> #${cluster.keepId}: ${error instanceof Error ? error.message : String(error)}`);
                }
            }
        }

        log(`\nSummary: ${apply ? "merged" : "would merge"}=${apply ? merged : plan.clusters.reduce((sum, cluster) => sum + cluster.dropIds.length, 0)} skipped=${skipped} failed=${failed}`);
        if (!apply) log("Dry run only. Re-run with --apply to perform the merges.");
    } finally {
        await app.close();
        await pool.end();
    }
}

main().catch(error => {
    console.error("Merge runner failed:", error);
    process.exit(1);
});
