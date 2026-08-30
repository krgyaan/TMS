/**
 * Backfill employee_imprest_voucher_items from existing vouchers.
 *
 * Links every approved imprest to the voucher(s) whose valid_from..valid_to
 * window covers its approval date — mirroring exactly the legacy virtual
 * grouping used by ImprestAdminService. Idempotent: safe to re-run.
 *
 * Optional --fix-amounts updates employee_imprest_vouchers.amount to the SUM
 * of its now-linked imprests (repairs any stale voucher total).
 *
 * Usage:
 *   pnpm run backfill:voucher-items
 *   pnpm run backfill:voucher-items -- --fix-amounts
 */
import "dotenv/config";
import { sql } from "drizzle-orm";
import { createPool, createDb } from "../src/db";

const FIX_AMOUNTS = process.argv.includes("--fix-amounts");

async function main() {
    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl) {
        console.error("DATABASE_URL not set — set it in the environment or .env.");
        process.exit(1);
    }

    const pool = createPool(dbUrl, 2, process.env.PGSSL === "true");
    const db = createDb(pool);

    console.log(`Backfill voucher items (${FIX_AMOUNTS ? "fix-amounts" : "link-only"})`);

    try {
        const linkResult = await db.execute(sql`
            INSERT INTO employee_imprest_voucher_items (voucher_id, imprest_id)
            SELECT v.id, ei.id
            FROM employee_imprest_vouchers v
            JOIN employee_imprests ei
                 ON ei.user_id = v.beneficiary_name::int
                AND ei.approval_status = 1
                AND COALESCE(ei.approved_date)::date BETWEEN v.valid_from::date AND v.valid_to::date
            WHERE v.beneficiary_name ~ '^[0-9]+$'
            ON CONFLICT (voucher_id, imprest_id) DO NOTHING
        `);

        const inserted = Number(linkResult.rowCount ?? 0);
        console.log(`  linked rows inserted/skipped: ${inserted}`);

        const voucherCount = Number(
            (
                await db.execute(sql`
                    SELECT COUNT(*)::int AS n
                    FROM employee_imprest_vouchers v
                    WHERE v.beneficiary_name ~ '^[0-9]+$'
                      AND EXISTS (
                          SELECT 1 FROM employee_imprests ei
                          WHERE ei.user_id = v.beneficiary_name::int
                            AND ei.approval_status = 1
                            AND COALESCE(ei.approved_date)::date BETWEEN v.valid_from::date AND v.valid_to::date
                      )
                `)
            ).rows?.[0]?.n ?? 0
        );
        console.log(`  vouchers with eligible imprests: ${voucherCount}`);

        if (FIX_AMOUNTS) {
            const fixResult = await db.execute(sql`
                UPDATE employee_imprest_vouchers v
                SET amount = COALESCE(
                    (
                        SELECT SUM(ei.amount)
                        FROM employee_imprest_voucher_items vi
                        JOIN employee_imprests ei ON ei.id = vi.imprest_id
                        WHERE vi.voucher_id = v.id
                    ),
                    0
                ),
                updated_at = now()
                WHERE v.beneficiary_name ~ '^[0-9]+$'
                  AND COALESCE(amount, 0) <> COALESCE(
                      (
                          SELECT SUM(ei.amount)
                          FROM employee_imprest_voucher_items vi
                          JOIN employee_imprests ei ON ei.id = vi.imprest_id
                          WHERE vi.voucher_id = v.id
                      ),
                      0
                  )
            `);
            console.log(`  voucher amounts corrected: ${Number(fixResult.rowCount ?? 0)}`);
        }
    } finally {
        await pool.end();
    }

    console.log(FIX_AMOUNTS ? "\nBackfill complete (+ amounts synced)." : "\nBackfill complete.");
    console.log("Run `pnpm run verify:voucher-items` to confirm counts/amounts match.");
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});
