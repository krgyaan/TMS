/**
 * Stage-B upload migration: reorganize the remaining upload directories that
 * are not managed by the file-upload module, so every upload lives under
 * uploads/<module>/<feature>/.
 *
 * Run AFTER migrate:uploads (Stage A) has completed on the live server.
 *
 * Usage:
 *   pnpm run migrate:uploads:v2            # actually move + update DB
 *   pnpm run migrate:uploads:v2 -- --dry-run  # preview only
 *
 * Folder moves (same-volume renames; merges into existing destinations):
 *   employeeimprest/                -> employee-imprest/
 *   leads-quotations/               -> crm/leads-quotations/
 *   site-visit/                     -> crm/site-visit/
 *   checklist/                      -> accounts/checklist/
 *   circulars/                      -> master/circulars/
 *   wo-documents/                   -> operations/wo-documents/
 *   tendering/payment-pdfs/po       -> operations/po/
 *   tendering/payment-pdfs/vwo      -> operations/vwo/
 *   tendering/payment-pdfs/chqcreate -> bi-dashboard/chqcreate/
 *   accounts/<root files>           -> accounts/follow-ups/   (files only)
 *   bi-dashboard/<root files>       -> bi-dashboard/bank-guarantee/  (files only)
 *   rmdir (if empty): amc/, amc-billing/, assets/
 *
 * DB rewrites (keep DB paths resolving after the moves):
 *   lead_followups.attachments (json array):
 *       legacy 'uploads/<file>' / 'uploads/accounts/<file>' / 'accounts/<file>'
 *       -> 'accounts/follow-ups/<file>'
 *   circulars.file:                     'uploads/circulars/' -> 'uploads/master/circulars/'
 *   purchase_orders.generated_pdf_versions (jsonb):
 *       'payment-pdfs/po/' -> 'operations/po/'
 *   vendor_work_orders.generated_pdf_versions (jsonb):
 *       'payment-pdfs/vwo/' -> 'operations/vwo/'
 *   payment_instruments.generated_pdf:
 *       'payment-pdfs/chqcreate/' -> 'bi-dashboard/chqcreate/'
 *   wo_acceptance.signed_wo_file_path:  'wo-documents/' -> 'operations/wo-documents/'
 *   wo_documents.file_path:             'wo-documents/' -> 'operations/wo-documents/'
 */
import 'dotenv/config';
import * as fs from 'fs';
import * as path from 'path';
import { sql } from 'drizzle-orm';
import { createPool, createDb } from '../src/db';

const UPLOADS_ROOT = path.join(process.cwd(), 'uploads');
const DRY_RUN = process.argv.includes('--dry-run');

const DIR_MOVES: Array<{ from: string; to: string }> = [
    { from: 'employeeimprest', to: 'employee-imprest' },
    { from: 'leads-quotations', to: 'crm/leads-quotations' },
    { from: 'site-visit', to: 'crm/site-visit' },
    { from: 'checklist', to: 'accounts/checklist' },
    { from: 'circulars', to: 'master/circulars' },
    { from: 'wo-documents', to: 'operations/wo-documents' },
    { from: 'tendering/payment-pdfs/po', to: 'operations/po' },
    { from: 'tendering/payment-pdfs/vwo', to: 'operations/vwo' },
    { from: 'tendering/payment-pdfs/chqcreate', to: 'bi-dashboard/chqcreate' },
];

const ROOT_FILE_MOVES: Array<{ fromDir: string; toDir: string }> = [
    { fromDir: 'accounts', toDir: 'accounts/follow-ups' },
    { fromDir: 'bi-dashboard', toDir: 'bi-dashboard/bank-guarantee' },
];

const EMPTY_DIR_DELETES = ['amc', 'amc-billing', 'assets'];

type DirAction = 'move' | 'merge' | 'skip-source-missing' | 'skip-source-empty';

interface DirPlanItem {
    from: string;
    to: string;
    action: DirAction;
    fileCount: number;
}

function dirAction(from: string, to: string): DirAction {
    if (!fs.existsSync(from)) return 'skip-source-missing';
    const items = fs.readdirSync(from);
    if (items.length === 0) return 'skip-source-empty';
    return fs.existsSync(to) ? 'merge' : 'move';
}

function buildDirPlan(): DirPlanItem[] {
    return DIR_MOVES.map(({ from, to }) => {
        const fromAbs = path.join(UPLOADS_ROOT, from);
        const toAbs = path.join(UPLOADS_ROOT, to);
        const action = dirAction(fromAbs, toAbs);
        const fileCount = fs.existsSync(fromAbs) ? fs.readdirSync(fromAbs).length : 0;
        return { from: fromAbs, to: toAbs, action, fileCount };
    });
}

function executeDirPlan(plan: DirPlanItem[]) {
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
                    console.log(`  [skip-collision] ${entry}`);
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

function buildRootFilePlan(): Array<{ from: string; to: string; fileCount: number }> {
    const plan: Array<{ from: string; to: string; fileCount: number }> = [];
    for (const { fromDir, toDir } of ROOT_FILE_MOVES) {
        const fromAbs = path.join(UPLOADS_ROOT, fromDir);
        if (!fs.existsSync(fromAbs)) continue;
        const files = fs.readdirSync(fromAbs).filter((e) => fs.statSync(path.join(fromAbs, e)).isFile());
        if (files.length === 0) continue;
        plan.push({ from: fromAbs, to: path.join(UPLOADS_ROOT, toDir), fileCount: files.length });
    }
    return plan;
}

function executeRootFilePlan(plan: Array<{ from: string; to: string; fileCount: number }>) {
    for (const item of plan) {
        fs.mkdirSync(item.to, { recursive: true });
        let moved = 0;
        let collisions = 0;
        for (const entry of fs.readdirSync(item.from)) {
            const src = path.join(item.from, entry);
            if (!fs.statSync(src).isFile()) continue;
            const dst = path.join(item.to, entry);
            if (fs.existsSync(dst)) {
                collisions++;
                console.log(`  [skip-collision] ${entry}`);
                continue;
            }
            fs.renameSync(src, dst);
            moved++;
        }
        console.log(`ROOT-MOVED ${item.from}/* -> ${item.to} (${moved} moved, ${collisions} collision(s))`);
    }
}

function buildDeletePlan(): Array<{ dir: string; deleted: boolean }> {
    return EMPTY_DIR_DELETES.map((dir) => {
        const abs = path.join(UPLOADS_ROOT, dir);
        if (!fs.existsSync(abs)) return { dir: abs, deleted: false };
        const items = fs.readdirSync(abs);
        return { dir: abs, deleted: items.length === 0 };
    });
}

function executeDeletePlan(plan: Array<{ dir: string; deleted: boolean }>) {
    for (const item of plan) {
        if (!item.deleted) continue;
        fs.rmdirSync(item.dir);
        console.log(`RMDIR  ${item.dir}`);
    }
}

const DB_REWRITES = [
    {
        name: 'lead_followups.attachments (legacy paths -> accounts/follow-ups/)',
        dryRunCount: sql`(
            SELECT count(*) FROM lead_followups
            WHERE attachments IS NOT NULL
              AND attachments::text LIKE '%uploads/%' OR attachments::text LIKE '%accounts/%'
        )`,
        apply: sql`
            UPDATE lead_followups
            SET attachments = (
                SELECT COALESCE(json_agg(
                    CASE
                        WHEN v ~ '^uploads/accounts/[^/]+$' THEN 'accounts/follow-ups/' || substring(v from 17)
                        WHEN v ~ '^uploads/[^/]+$' THEN 'accounts/follow-ups/' || substring(v from 9)
                        WHEN v ~ '^accounts/[^/]+$' THEN 'accounts/follow-ups/' || v
                        ELSE v
                    END
                ), '[]'::json)
                FROM jsonb_array_elements_text(attachments::jsonb) AS t(v)
            )
            WHERE attachments IS NOT NULL
              AND (attachments::text LIKE '%uploads/%' OR attachments::text LIKE '%accounts/%')
        `,
    },
    {
        name: 'circulars.file (uploads/circulars/ -> uploads/master/circulars/)',
        dryRunCount: sql`(SELECT count(*) FROM circulars WHERE file LIKE 'uploads/circulars/%')`,
        apply: sql`
            UPDATE circulars
            SET file = replace(file, 'uploads/circulars/', 'uploads/master/circulars/')
            WHERE file LIKE 'uploads/circulars/%'
        `,
    },
    {
        name: 'purchase_orders.generated_pdf_versions (payment-pdfs/po/ -> operations/po/)',
        dryRunCount: sql`(SELECT count(*) FROM purchase_orders WHERE generated_pdf_versions::text LIKE '%payment-pdfs/po/%')`,
        apply: sql`
            UPDATE purchase_orders
            SET generated_pdf_versions = (
                SELECT COALESCE(jsonb_object_agg(k, replace(v::text, '"payment-pdfs/po/', '"operations/po/')::jsonb), '{}'::jsonb)
                FROM jsonb_each(generated_pdf_versions) AS t(k, v)
            )
            WHERE generated_pdf_versions::text LIKE '%payment-pdfs/po/%'
        `,
    },
    {
        name: 'vendor_work_orders.generated_pdf_versions (payment-pdfs/vwo/ -> operations/vwo/)',
        dryRunCount: sql`(SELECT count(*) FROM vendor_work_orders WHERE generated_pdf_versions::text LIKE '%payment-pdfs/vwo/%')`,
        apply: sql`
            UPDATE vendor_work_orders
            SET generated_pdf_versions = (
                SELECT COALESCE(jsonb_object_agg(k, replace(v::text, '"payment-pdfs/vwo/', '"operations/vwo/')::jsonb), '{}'::jsonb)
                FROM jsonb_each(generated_pdf_versions) AS t(k, v)
            )
            WHERE generated_pdf_versions::text LIKE '%payment-pdfs/vwo/%'
        `,
    },
    {
        name: 'payment_instruments.generated_pdf (payment-pdfs/chqcreate/ -> bi-dashboard/chqcreate/)',
        dryRunCount: sql`(SELECT count(*) FROM payment_instruments WHERE generated_pdf LIKE 'payment-pdfs/chqcreate/%')`,
        apply: sql`
            UPDATE payment_instruments
            SET generated_pdf = replace(generated_pdf, 'payment-pdfs/chqcreate/', 'bi-dashboard/chqcreate/')
            WHERE generated_pdf LIKE 'payment-pdfs/chqcreate/%'
        `,
    },
    {
        name: 'wo_acceptance.signed_wo_file_path (wo-documents/ -> operations/wo-documents/)',
        dryRunCount: sql`(SELECT count(*) FROM wo_acceptance WHERE signed_wo_file_path LIKE 'wo-documents/%')`,
        apply: sql`
            UPDATE wo_acceptance
            SET signed_wo_file_path = replace(signed_wo_file_path, 'wo-documents/', 'operations/wo-documents/')
            WHERE signed_wo_file_path LIKE 'wo-documents/%'
        `,
    },
    {
        name: 'wo_documents.file_path (wo-documents/ -> operations/wo-documents/)',
        dryRunCount: sql`(SELECT count(*) FROM wo_documents WHERE file_path LIKE 'wo-documents/%')`,
        apply: sql`
            UPDATE wo_documents
            SET file_path = replace(file_path, 'wo-documents/', 'operations/wo-documents/')
            WHERE file_path LIKE 'wo-documents/%'
        `,
    },
];

async function main() {
    const dirPlan = buildDirPlan();
    const rootFilePlan = buildRootFilePlan();
    const deletePlan = buildDeletePlan();

    const dirMoves = dirPlan.filter((p) => p.action === 'move' || p.action === 'merge');
    const dirSkipped = dirPlan.filter((p) => p.action !== 'move' && p.action !== 'merge');

    console.log(`\nUpload migration v2 (${DRY_RUN ? 'DRY RUN' : 'LIVE'})`);
    console.log(`\n[Folders]`);
    console.log(`Moves to perform: ${dirMoves.length}`);
    for (const item of dirMoves) {
        console.log(`  [${item.action}] ${item.from} -> ${item.to} (${item.fileCount} item(s))`);
    }
    console.log(`Skipped: ${dirSkipped.length}`);
    for (const item of dirSkipped) {
        console.log(`  [${item.action}] ${item.from}`);
    }
    console.log(`\n[Root files]`);
    console.log(`Moves to perform: ${rootFilePlan.length}`);
    for (const item of rootFilePlan) {
        console.log(`  ${item.from}/* -> ${item.to} (${item.fileCount} file(s))`);
    }
    console.log(`\n[Empty dirs to remove]`);
    for (const item of deletePlan) {
        console.log(`  ${item.deleted ? '[rmdir]' : '[skip] '} ${item.dir}`);
    }

    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl) {
        console.error('\nDATABASE_URL not set — skipping DB rewrites. Set it in the environment or .env.');
    } else {
        const pool = createPool(dbUrl, 2, process.env.PGSSL === 'true');
        const db = createDb(pool);
        try {
            console.log('\n[DB rewrites]');
            for (const rewrite of DB_REWRITES) {
                const result = await db.execute(sql`SELECT ${rewrite.dryRunCount} AS count`);
                const count = Number(result.rows?.[0]?.count ?? 0);
                console.log(`  ${count.toString().padStart(6)}  ${rewrite.name}`);
                if (!DRY_RUN && count > 0) {
                    await db.execute(rewrite.apply);
                    console.log(`         applied`);
                }
            }
        } finally {
            await pool.end();
        }
    }

    if (!DRY_RUN) {
        if (dirMoves.length > 0) executeDirPlan(dirPlan);
        if (rootFilePlan.length > 0) executeRootFilePlan(rootFilePlan);
        executeDeletePlan(deletePlan);
        console.log('\nDone.');
    } else {
        console.log('\nNothing moved (dry run). Re-run without --dry-run to apply.');
    }
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});