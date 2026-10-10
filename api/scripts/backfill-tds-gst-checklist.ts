/**
 * Backfill TDS + GST checklist data for existing PO and VWO records.
 *
 * TDS pass
 *   For every PR with status = 'payment_done' linked to a PO or a VWO whose
 *   document-level TDS (tds_percentage / tds_amount) applies:
 *     - PRs that already have actual_tds_deducted > 0 are left untouched and
 *       their value is counted toward the document cap first (idempotent).
 *     - PRs with actual_tds_deducted = 0 / NULL get
 *       computeTdsDeducted(amount, docPct, docCap, used) applied, written back
 *       to actual_tds_deducted, and a tds_returns row created (one per PR).
 *     - tds_returns.tds_return_date = PR updated_at date (payment date proxy).
 *     - PRs without project_id only get the amount updated (no checklist row).
 *   The cumulative TDS per document never exceeds tds_amount.
 *
 * GST pass
 *   Every project_purchase_invoices row with gst_amount > 0 linked to a PO or
 *   VWO and a non-null invoice_date gets a gst2b_reco row
 *   (invoice_date / invoice_uploaded_at = invoice invoice_date / created_at).
 *
 * Both passes are idempotent: re-running is a no-op for already-backfilled rows.
 *
 * Usage:
 *   npx tsx scripts/backfill-tds-gst-checklist.ts --dry-run   # preview only
 *   npx tsx scripts/backfill-tds-gst-checklist.ts             # apply
 */
import "dotenv/config";
import { sql } from "drizzle-orm";
import { createPool, createDb } from "../src/db";
import { computeTdsDeducted } from "../src/modules/operations/payment-requests/helpers/tds-calculator";

const DRY_RUN = process.argv.includes("--dry-run");

interface TdsRow {
    id: number;
    project_id: number | null;
    amount: string | null;
    actual_tds_deducted: string | null;
    paid_date: string;
    purchase_order_id: number | null;
    vendor_work_order_id: number | null;
    doc_tds_pct: string | null;
    doc_tds_amt: string | null;
}

interface TdsWrite {
    description: string;
    statement: any;
}

const TDS_SELECT = sql`
    SELECT pr.id,
           pr.project_id,
           pr.amount,
           pr.actual_tds_deducted,
           COALESCE(TO_CHAR(pr.updated_at, 'YYYY-MM-DD'), TO_CHAR(pr.created_at, 'YYYY-MM-DD')) AS paid_date,
           pr.purchase_order_id,
           pr.vendor_work_order_id,
           COALESCE(po.tds_percentage, vwo.tds_percentage) AS doc_tds_pct,
           COALESCE(po.tds_amount, vwo.tds_amount)         AS doc_tds_amt
      FROM project_payment_requests pr
      LEFT JOIN purchase_orders po  ON po.id  = pr.purchase_order_id
      LEFT JOIN vendor_work_orders vwo ON vwo.id = pr.vendor_work_order_id
     WHERE pr.status = 'payment_done'
       AND (pr.purchase_order_id IS NOT NULL OR pr.vendor_work_order_id IS NOT NULL)
     ORDER BY pr.created_at NULLS FIRST, pr.id
`;

const GST_SELECT_COUNT = sql`
    SELECT COUNT(*)::int AS total,
           COUNT(*) FILTER (WHERE NOT EXISTS (
               SELECT 1 FROM gst2b_reco g WHERE g.invoice_id = pi.id
           ))::int AS missing,
           COUNT(*) FILTER (WHERE pi.invoice_date IS NULL)::int AS no_date
      FROM project_purchase_invoices pi
     WHERE COALESCE(pi.gst_amount, 0) > 0
       AND (pi.purchase_order_id IS NOT NULL OR pi.vendor_work_order_id IS NOT NULL)
       AND pi.project_id IS NOT NULL
`;

const GST_INSERT = sql`
    INSERT INTO gst2b_reco (project_id, po_id, vwo_id, invoice_id, invoice_date, invoice_uploaded_at, gst_amount)
    SELECT pi.project_id,
           pi.purchase_order_id,
           pi.vendor_work_order_id,
           pi.id,
           pi.invoice_date,
           pi.created_at,
           pi.gst_amount
      FROM project_purchase_invoices pi
     WHERE COALESCE(pi.gst_amount, 0) > 0
       AND (pi.purchase_order_id IS NOT NULL OR pi.vendor_work_order_id IS NOT NULL)
       AND pi.invoice_date IS NOT NULL
       AND pi.project_id IS NOT NULL
       AND NOT EXISTS (SELECT 1 FROM gst2b_reco g WHERE g.invoice_id = pi.id)
    ON CONFLICT (invoice_id) DO NOTHING
`;

function groupKey(row: TdsRow): string | null {
    if (row.purchase_order_id != null) return `po:${row.purchase_order_id}`;
    if (row.vendor_work_order_id != null) return `vwo:${row.vendor_work_order_id}`;
    return null;
}

async function backfillTds(db: ReturnType<typeof createDb>) {
    const result = await db.execute(TDS_SELECT);
    const rows = (result as any).rows as TdsRow[];

    const groups = new Map<string, TdsRow[]>();
    let skippedNoProject = 0;

    for (const row of rows) {
        const key = groupKey(row);
        if (!key) continue;
        const list = groups.get(key);
        if (list) list.push(row);
        else groups.set(key, [row]);
    }

    const writes: TdsWrite[] = [];
    let eligibleDocs = 0;
    let skippedDocs = 0;
    let prsFilled = 0;
    let returnRows = 0;
    let repairedReturns = 0;
    let plannedTds = 0;

    for (const [, list] of groups) {
        const docPct = Number(list[0].doc_tds_pct ?? 0);
        const docCap = Number(list[0].doc_tds_amt ?? 0);
        if (docPct <= 0 || docCap <= 0) {
            skippedDocs += 1;
            continue;
        }
        eligibleDocs += 1;

        let used = 0;

        // Pass 1 — honour values already recorded (never overwrite) and make
        // sure each of them has a checklist row.
        for (const row of list) {
            const existing = Number(row.actual_tds_deducted ?? 0);
            if (existing <= 0) continue;
            used += existing;

            if (row.project_id == null) {
                skippedNoProject += 1;
                continue;
            }
            writes.push({
                description: `tds_returns pr_id=${row.id} (existing ${existing.toFixed(2)})`,
                statement: sql`
                    INSERT INTO tds_returns (project_id, po_id, vwo_id, pr_id, tds_amount, tds_return_date)
                    VALUES (${row.project_id}, ${row.purchase_order_id}, ${row.vendor_work_order_id}, ${row.id},
                            ${existing.toFixed(2)}, ${row.paid_date})
                    ON CONFLICT (pr_id) DO NOTHING
                `,
            });
            repairedReturns += 1;
        }

        // Pass 2 — allocate the remaining cap to PRs with nothing recorded yet.
        for (const row of list) {
            const existing = Number(row.actual_tds_deducted ?? 0);
            if (existing > 0) continue;

            const actual = computeTdsDeducted(Number(row.amount ?? 0), docPct, docCap, used);
            if (actual <= 0) continue;
            used += actual;
            prsFilled += 1;
            plannedTds += actual;

            writes.push({
                description: `actual_tds_deducted pr_id=${row.id} = ${actual.toFixed(2)}`,
                statement: sql`
                    UPDATE project_payment_requests
                       SET actual_tds_deducted = ${actual.toFixed(2)}
                     WHERE id = ${row.id}
                       AND COALESCE(actual_tds_deducted, 0) = 0
                `,
            });

            if (row.project_id == null) {
                skippedNoProject += 1;
                continue;
            }
            writes.push({
                description: `tds_returns pr_id=${row.id} (${actual.toFixed(2)})`,
                statement: sql`
                    INSERT INTO tds_returns (project_id, po_id, vwo_id, pr_id, tds_amount, tds_return_date)
                    VALUES (${row.project_id}, ${row.purchase_order_id}, ${row.vendor_work_order_id}, ${row.id},
                            ${actual.toFixed(2)}, ${row.paid_date})
                    ON CONFLICT (pr_id) DO NOTHING
                `,
            });
            returnRows += 1;
        }
    }

    console.log(`\n=== TDS backfill ===`);
    console.log(`  payment_done PRs linked to a document : ${rows.length}`);
    console.log(`  documents scanned                     : ${groups.size}`);
    console.log(`  eligible documents (TDS% > 0)         : ${eligibleDocs}`);
    console.log(`  documents skipped (no TDS)            : ${skippedDocs}`);
    console.log(`  PRs to fill                           : ${prsFilled}`);
    console.log(`  planned TDS to apply                  : ${plannedTds.toFixed(2)}`);
    console.log(`  tds_returns rows to insert            : ${returnRows}`);
    console.log(`  existing TDS rows ensured             : ${repairedReturns}`);
    if (skippedNoProject) console.log(`  PRs without project (amount only)     : ${skippedNoProject}`);

    if (DRY_RUN) {
        console.log(`  [dry-run] would apply ${writes.length} statements`);
        return;
    }

    await db.transaction(async (tx: any) => {
        for (const w of writes) await tx.execute(w.statement);
    });
    console.log(`  applied ${writes.length} statements`);
}

async function backfillGst(db: ReturnType<typeof createDb>) {
    const result = await db.execute(GST_SELECT_COUNT);
    const counts = (result as any).rows?.[0] ?? {};
    const total = Number(counts.total ?? 0);
    const missing = Number(counts.missing ?? 0);
    const noDate = Number(counts.no_date ?? 0);

    console.log(`\n=== GST backfill (gst2b_reco) ===`);
    console.log(`  qualifying invoices (gst > 0, PO/VWO) : ${total}`);
    console.log(`  without invoice_date (skipped)        : ${noDate}`);
    console.log(`  reco rows to insert                   : ${missing}`);

    if (DRY_RUN) {
        console.log(`  [dry-run] would insert ${missing} rows`);
        return;
    }

    if (missing === 0) {
        console.log(`  nothing to do`);
        return;
    }

    const applied = await db.execute(GST_INSERT);
    console.log(`  inserted ${(applied as any).rowCount ?? missing} rows`);
}

async function main() {
    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl) {
        console.error("DATABASE_URL not set — set it in the environment or .env.");
        process.exit(1);
    }

    const pool = createPool(dbUrl, 2, process.env.PGSSL === "true");
    const db = createDb(pool);

    console.log(`Backfill TDS/GST checklists (${DRY_RUN ? "dry-run" : "apply"})`);

    try {
        await backfillTds(db);
        await backfillGst(db);
        console.log(`\nDone.`);
    } finally {
        await pool.end().catch(() => undefined);
    }
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
