/**
 * One-time migration: move existing upload files from their old location
 * (uploads/tendering/{context}) to the module folder configured per context
 * (uploads/{storageDir}/{context}).
 *
 * Usage:
 *   pnpm run migrate:uploads            # actually move
 *   pnpm run migrate:uploads -- --dry-run  # preview only
 *
 * Idempotent: contexts already at the destination (or with no source files)
 * are skipped; safe to re-run.
 *
 * The destination may already exist — the app creates the module dirs at
 * startup (ensureDirectoriesExist) and new uploads may have landed there
 * after deploy. In that case the source items are merged into the existing
 * destination item-by-item (same-volume rename, no copying); names that
 * already exist in the destination are left untouched.
 *
 * Run on the live server after deploying the per-module storageDir config.
 */
import * as fs from 'fs';
import * as path from 'path';
import { FILE_CONFIGS, DEFAULT_STORAGE_DIR } from '../src/modules/file-upload/config';

const UPLOADS_ROOT = path.join(process.cwd(), 'uploads');
const DRY_RUN = process.argv.includes('--dry-run');

type Action = 'move' | 'merge' | 'skip-source-missing' | 'skip-source-empty';

interface PlanItem {
    context: string;
    from: string;
    to: string;
    action: Action;
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
        const fileCount = fs.readdirSync(from).length;
        if (fileCount === 0) {
            plan.push({ context, from, to, action: 'skip-source-empty', fileCount: 0 });
            continue;
        }
        const action: Action = fs.existsSync(to) ? 'merge' : 'move';
        plan.push({ context, from, to, action, fileCount });
    }
    return plan;
}

function execute(plan: PlanItem[]) {
    for (const item of plan) {
        if (item.action === 'move') {
            fs.mkdirSync(path.dirname(item.to), { recursive: true });
            fs.renameSync(item.from, item.to);
            console.log(`MOVED  ${item.from} -> ${item.to} (${item.fileCount} item(s))`);
        } else if (item.action === 'merge') {
            fs.mkdirSync(item.to, { recursive: true });
            let moved = 0;
            let collisions = 0;
            for (const entry of fs.readdirSync(item.from)) {
                const src = path.join(item.from, entry);
                const dst = path.join(item.to, entry);
                if (fs.existsSync(dst)) {
                    collisions++;
                    console.log(`  [skip-collision] ${item.context}/${entry}`);
                    continue;
                }
                fs.renameSync(src, dst);
                moved++;
            }
            fs.rmdirSync(item.from);
            console.log(`MERGED ${item.from} -> ${item.to} (${moved} moved, ${collisions} collision(s))`);
        }
    }
}

function main() {
    const plan = buildPlan();
    const moves = plan.filter((p) => p.action === 'move' || p.action === 'merge');
    const skipped = plan.filter((p) => p.action !== 'move' && p.action !== 'merge');

    console.log(`\nUpload storage migration (${DRY_RUN ? 'DRY RUN' : 'LIVE'})`);
    console.log(`Moves to perform: ${moves.length}`);
    for (const item of moves) {
        console.log(`  [${item.action}] ${item.from} -> ${item.to} (${item.fileCount} item(s))`);
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