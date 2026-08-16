/**
 * One-time migration: move existing upload files from their old location
 * (uploads/tendering/{context}) to the module folder configured per context
 * (uploads/{storageDir}/{context}).
 *
 * Usage:
 *   pnpm run migrate:uploads            # actually move
 *   pnpm run migrate:uploads -- --dry-run  # preview only
 *
 * Idempotent: contexts already at the destination are skipped; safe to re-run.
 * Run on the live server after deploying the per-module storageDir config.
 */
import * as fs from 'fs';
import * as path from 'path';
import { FILE_CONFIGS, DEFAULT_STORAGE_DIR } from '../src/modules/file-upload/config';

const UPLOADS_ROOT = path.join(process.cwd(), 'uploads');
const DRY_RUN = process.argv.includes('--dry-run');

interface PlanItem {
    context: string;
    from: string;
    to: string;
    action: 'move' | 'skip-dest-exists' | 'skip-source-missing';
    fileCount: number;
}

function buildPlan(): PlanItem[] {
    const plan: PlanItem[] = [];
    for (const [context, config] of Object.entries(FILE_CONFIGS)) {
        const storageDir = config.storageDir ?? DEFAULT_STORAGE_DIR;
        if (storageDir === DEFAULT_STORAGE_DIR) continue;

        const from = path.join(UPLOADS_ROOT, DEFAULT_STORAGE_DIR, context);
        const to = path.join(UPLOADS_ROOT, storageDir, context);

        if (!fs.existsSync(from)) {
            plan.push({ context, from, to, action: 'skip-source-missing', fileCount: 0 });
            continue;
        }
        if (fs.existsSync(to)) {
            const fileCount = fs.readdirSync(from).length;
            plan.push({ context, from, to, action: 'skip-dest-exists', fileCount });
            continue;
        }
        const fileCount = fs.readdirSync(from).length;
        plan.push({ context, from, to, action: 'move', fileCount });
    }
    return plan;
}

function execute(plan: PlanItem[]) {
    for (const item of plan) {
        if (item.action !== 'move') continue;
        fs.mkdirSync(path.dirname(item.to), { recursive: true });
        fs.renameSync(item.from, item.to);
        console.log(`MOVED  ${item.from} -> ${item.to} (${item.fileCount} item(s))`);
    }
}

function main() {
    const plan = buildPlan();
    const moves = plan.filter((p) => p.action === 'move');
    const skipped = plan.filter((p) => p.action !== 'move');

    console.log(`\nUpload storage migration (${DRY_RUN ? 'DRY RUN' : 'LIVE'})`);
    console.log(`Moves to perform: ${moves.length}`);
    for (const item of moves) {
        console.log(`  ${item.from} -> ${item.to} (${item.fileCount} item(s))`);
    }
    console.log(`Skipped: ${skipped.length}`);
    for (const item of skipped) {
        console.log(`  [${item.action}] ${item.context}`);
    }

    if (!DRY_RUN && moves.length > 0) {
        execute(plan);
        console.log('\nDone.');
    } else if (DRY_RUN) {
        console.log('\nNothing moved (dry run). Re-run without --dry-run to apply.');
    } else {
        console.log('\nNothing to do.');
    }
}

main();