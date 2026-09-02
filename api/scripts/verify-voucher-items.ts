/**
 * Verify that employee_imprest_voucher_items reproduces the voucher grouping:
 *
 *   - per voucher: expected item count & sum (effective date BETWEEN validFrom/To)
 *     must equal actual count & sum (linked via the join table)
 *   - voucher.amount must equal the sum of its linked imprests
 *   - every approved imprest covered by a voucher window must be linked (no orphans)
 *   - no linked imprest may fall outside its voucher's window (no strays)
 *
 * The effective date defaults to date_of_expense (strict Phase 1 grouping).
 * Pass --legacy to compare against the old approval-date grouping (audit only:
 * historical vouchers bucketed by approval week will then match, expense-week
 * vouchers will not). Use --report-only to surface drift without failing.
 *
 * Exits 1 on any mismatch unless --report-only is passed.
 *
 * Usage:
 *   pnpm run verify:voucher-items
 *   pnpm run verify:voucher-items -- --legacy
 *   pnpm run verify:voucher-items -- --report-only
 */
import "dotenv/config";
import { sql } from "drizzle-orm";
import { createPool, createDb } from "../src/db";

const REPORT_ONLY = process.argv.includes("--report-only");
const LEGACY = process.argv.includes("--legacy");

const effectiveDate = LEGACY ? sql`COALESCE(ei.approved_date)` : sql`ei.date_of_expense`;

async function main() {
    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl) {
        console.error("DATABASE_URL not set — set it in the environment or .env.");
        process.exit(1);
    }

    const pool = createPool(dbUrl, 2, process.env.PGSSL === "true");
    const db = createDb(pool);

    console.log(`Verify voucher items (${REPORT_ONLY ? "report-only" : "strict"}, ${LEGACY ? "approval-date" : "expense-date"} window)`);

    try {
        const expected = await db.execute(sql`
            SELECT
                v.id,
                v.voucher_code,
                COUNT(ei.id)::int AS expected_count,
                COALESCE(SUM(ei.amount), 0)::numeric AS expected_sum,
                v.amount
            FROM employee_imprest_vouchers v
            LEFT JOIN employee_imprests ei
                ON ei.user_id = v.beneficiary_name::int
               AND ei.approval_status = 1
               AND ${effectiveDate}::date BETWEEN v.valid_from::date AND v.valid_to::date
            WHERE v.beneficiary_name ~ '^[0-9]+$'
            GROUP BY v.id, v.voucher_code, v.amount
            ORDER BY v.id
        `);

        const actual = await db.execute(sql`
            SELECT
                vi.voucher_id,
                COUNT(*)::int AS actual_count,
                COALESCE(SUM(ei.amount), 0)::numeric AS actual_sum
            FROM employee_imprest_voucher_items vi
            JOIN employee_imprests ei ON ei.id = vi.imprest_id
            GROUP BY vi.voucher_id
            ORDER BY vi.voucher_id
        `);

        type ExpectedRow = {
            id: number | string;
            voucher_code: string | null;
            expected_count: number | string;
            expected_sum: number | string;
            amount: number | string;
        };

        type ActualRow = {
            voucher_id: number | string;
            actual_count: number | string;
            actual_sum: number | string;
        };

        const actualMap = new Map<number, { actualCount: number; actualSum: number }>();
        for (const r of actual.rows as ActualRow[]) {
            actualMap.set(Number(r.voucher_id), {
                actualCount: Number(r.actual_count),
                actualSum: Number(r.actual_sum),
            });
        }

        let mismatchCount = 0;
        const rows = expected.rows as ExpectedRow[];
        console.log(
            `\n${String("voucher").padEnd(20)} ${String("expCnt").padStart(6)} ${String("actCnt").padStart(6)} ${String("expSum").padStart(12)} ${String("actSum").padStart(12)} ${String("vAmount").padStart(12)}  status`
        );

        for (const r of rows) {
            const id = Number(r.id);
            const a = actualMap.get(id);
            const expCount = Number(r.expected_count);
            const expSum = Number(r.expected_sum);
            const actCount = a?.actualCount ?? 0;
            const actSum = a?.actualSum ?? 0;
            const vAmount = Number(r.amount);

            const countOk = expCount === actCount;
            const sumOk = expSum === actSum;
            const amountOk = vAmount === expSum;

            const status = countOk && sumOk && amountOk ? "OK" : "MISMATCH";
            if (status !== "OK") mismatchCount += 1;

            if (status !== "OK" || process.argv.includes("--verbose")) {
                console.log(
                    `${String(r.voucher_code ?? `v#${id}`).padEnd(20)} ${String(expCount).padStart(6)} ${String(actCount).padStart(6)} ${String(expSum).padStart(12)} ${String(actSum).padStart(12)} ${String(vAmount).padStart(12)}  ${status}`
                );
            }
        }

        const [orphans] = (
            await db.execute(sql`
                SELECT COUNT(*)::int AS n
                FROM employee_imprests ei
                WHERE ei.approval_status = 1
                  AND EXISTS (
                      SELECT 1
                      FROM employee_imprest_vouchers v
                      WHERE v.beneficiary_name = ei.user_id::text
                        AND ${effectiveDate}::date BETWEEN v.valid_from::date AND v.valid_to::date
                  )
                  AND NOT EXISTS (
                      SELECT 1 FROM employee_imprest_voucher_items vi WHERE vi.imprest_id = ei.id
                  )
            `)
        ).rows;
        const [strays] = (
            await db.execute(sql`
                SELECT COUNT(*)::int AS n
                FROM employee_imprest_voucher_items vi
                JOIN employee_imprests ei ON ei.id = vi.imprest_id
                JOIN employee_imprest_vouchers v ON v.id = vi.voucher_id
                WHERE v.beneficiary_name ~ '^[0-9]+$'
                  AND (
                      ei.user_id <> v.beneficiary_name::int
                      OR ei.approval_status <> 1
                      OR ${effectiveDate}::date NOT BETWEEN v.valid_from::date AND v.valid_to::date
                  )
            `)
        ).rows;

        const orphanCount = Number(orphans?.n ?? 0);
        const strayCount = Number(strays?.n ?? 0);

        console.log(`\n  vouchers checked     : ${rows.length}`);
        console.log(`  item-count mismatches: ${mismatchCount}`);
        console.log(`  orphan imprests      : ${orphanCount}`);
        console.log(`  stray links          : ${strayCount}`);

        if (mismatchCount === 0 && orphanCount === 0 && strayCount === 0) {
            console.log(`\nRESULT: PASS — join table matches ${LEGACY ? "approval-date" : "expense-date"} grouping.`);
        } else {
            console.log("\nRESULT: FAIL — differences found.");
            if (mismatchCount > 0) console.log("  Run `pnpm run backfill:voucher-items -- --fix-amounts` then re-verify.");
            if (REPORT_ONLY) {
                console.log("  (--report-only: exiting without failure.)");
            } else {
                process.exitCode = 1;
            }
        }
    } finally {
        await pool.end();
    }
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});
