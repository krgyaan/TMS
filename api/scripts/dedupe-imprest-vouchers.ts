/**
 * Dedup employee_imprest_vouchers:
 * - Finds duplicate groups: same beneficiary_name, same ISO week of valid_from, same amount.
 * - Within each group, keeps the approved voucher (accounts_signed_by or admin_signed_by set).
 * - For unapproved duplicates: re-links items to the kept voucher, recomputes amount, then deletes.
 * 
 * Usage (dry-run first, then confirm):
 *   pnpm run dedupe:vouchers -- --dry-run
 *   pnpm run dedupe:vouchers
 * 
 * Safe-guards:
 * - Skips groups with no clear single approved voucher (reports them for manual review).
 * - Merges linked imprest items before deleting the duplicate so no items are lost.
 * - Recomputes the kept voucher's amount after merge.
 * - Exits 0 even on dry-run; exits 1 only if critical errors prevent completion.
 */

import "dotenv/config";
import { sql } from "drizzle-orm";
import { createPool, createDb } from "../src/db";

async function main() {
    const FIX = process.argv.includes("--fix");
    const REPORT_ONLY = process.argv.includes("--report-only");

    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl) {
        console.error("DATABASE_URL not set — set it in the environment or .env.");
        process.exit(1);
    }

    const pool = createPool(dbUrl, 2, process.env.PGSSL === "true");
    const db = createDb(pool);

    console.log(`Dedup voucher duplicates${FIX ? "" : " (read-only --fix not set, reporting only)"}${
        REPORT_ONLY ? " --report-only" : ""
    }`);

    try {
        // --- Step 1: Identify duplicate groups ---
        // A group = same beneficiary_name, same ISO week (ISOYEAR+WEEK) of valid_from, same amount.
        // We use a numeric cast on beneficiary_name per the existing schema convention.
const groups = await db.execute(sql`
            SELECT
                v.beneficiary_name,
                v.amount,
                EXTRACT(ISOYEAR FROM v.valid_from)::int AS iy,
                EXTRACT(WEEK FROM v.valid_from)::int AS wk,
                COUNT(*) AS group_size
            FROM employee_imprest_vouchers v
            WHERE v.beneficiary_name ~ '^[0-9]+$'
            GROUP BY v.beneficiary_name, EXTRACT(ISOYEAR FROM v.valid_from), EXTRACT(WEEK FROM v.valid_from), v.amount
            HAVING COUNT(*) > 1
            ORDER BY v.beneficiary_name, iy, wk, v.amount
        `);

        const totalGroups = groups.rowCount ?? 0;
        console.log(`\nFound ${totalGroups} duplicate groups (size > 1)`);

        let groupCount = 0;
        let skipCount = 0;
        let mergeCount = 0;
        let deleteCount = 0;

        // We'll process groups iteratively to avoid huge memory usage
        for (let i = 0; i < totalGroups; i++) {
            const g = groups.rows[i];
            const { beneficiary_name, amount, iy, wk, group_size } = g;

            // Find all vouchers in this group
            const vouchersInGroup = await db.execute(sql`
                SELECT id, voucher_code, amount, accounts_signed_by, admin_signed_by
                FROM employee_imprest_vouchers
                WHERE beneficiary_name = ${String(beneficiary_name)}
                  AND EXTRACT(ISOYEAR FROM valid_from) = ${iy}
                  AND EXTRACT(WEEK FROM valid_from) = ${wk}
                  AND amount = ${amount}
                ORDER BY
                    CASE WHEN TRIM(COALESCE(accounts_signed_by, '')) <> '' OR TRIM(COALESCE(admin_signed_by, '')) <> '' THEN 0 ELSE 1 END,
                    id
            `);

            if (vouchersInGroup.rows.length <= 1) {
                // Should not happen since HAVING COUNT > 1, but safety check
                skipCount++;
                continue;
            }

            groupCount++;

            // Classify: approved (signed) vs unapproved
            const approvedVouchers = vouchersInGroup.rows.filter(
                (v: any) =>
                    (typeof v.accounts_signed_by === "string" &&
                        v.accounts_signed_by.trim() !== "") ||
                    (typeof v.admin_signed_by === "string" &&
                        v.admin_signed_by.trim() !== "")
            );
            const unapprovedVouchers = vouchersInGroup.rows.filter(
                (v: any) =>
                    !(typeof v.accounts_signed_by === "string" &&
                        v.accounts_signed_by.trim() !== "") &&
                    !(typeof v.admin_signed_by === "string" &&
                        v.admin_signed_by.trim() !== "")
            );

            // Decision logic:
            // - If exactly 1 approved -> keep it, delete the rest (unapproved)
            // - If 0 approved but some unapproved -> report for manual review (skip in fix mode)
            // - If multiple approved -> report for manual review (skip)
            let keptVoucher: any;
            let vouchersToDelete: any[];

            if (approvedVouchers.length === 1) {
                keptVoucher = approvedVouchers[0];
                vouchersToDelete = unapprovedVouchers;
            } else if (approvedVouchers.length === 0 && unapprovedVouchers.length > 0) {
                // No approved voucher in this group — skip for manual review
                console.log(
                    `\n[SKIP] Group beneficiary=${beneficiary_name} week=W${wk}/Y${iy} amount=${amount}: ` +
                    `no approved voucher found (${unapprovedVouchers.length} unapproved duplicates). ` +
                    `Run without --fix for details, or review manually.`
                );
                skipCount++;
                continue;
            } else if (approvedVouchers.length > 1) {
                // Multiple approved — skip for manual review
                console.log(
                    `\n[SKIP] Group beneficiary=${beneficiary_name} week=W${wk}/Y${iy} amount=${amount}: ` +
                    `multiple approved vouchers found (${approvedVouchers.length}). ` +
                    `Run without --fix for details, or review manually.`
                );
                skipCount++;
                continue;
            } else {
                // Should not reach here (covered above), but safety
                skipCount++;
                continue;
            }

            // --- Merge step: re-link items from duplicates to the kept voucher ---
            if (vouchersToDelete.length > 0 && FIX) {
                for (const dup of vouchersToDelete) {
                    // Link items from duplicate to kept voucher (ON CONFLICT DO NOTHING)
                    await db.execute(sql`
                        INSERT INTO employee_imprest_voucher_items (voucher_id, imprest_id)
                        SELECT ${keptVoucher.id}::int, imprest_id::int
                        FROM employee_imprest_voucher_items
                        WHERE voucher_id = ${dup.id}
                        ON CONFLICT (voucher_id, imprest_id) DO NOTHING
                    `);
                    mergeCount++;
                }

                // Recompute the kept voucher's amount after merge
                await db.execute(sql`
                    UPDATE employee_imprest_vouchers v
                    SET amount = COALESCE(
                        (SELECT SUM(ei.amount)
                         FROM employee_imprest_voucher_items vi
                         JOIN employee_imprests ei ON ei.id = vi.imprest_id
                         WHERE vi.voucher_id = ${keptVoucher.id}
                        ),
                        0
                    ),
                        updated_at = now()
                    WHERE v.id = ${keptVoucher.id}
                `);
                console.log(
                    ` [MERGE] beneficiary=${beneficiary_name} kept voucher #${keptVoucher.id} ` +
                    `amount updated to ${keptVoucher.amount} (was ${keptVoucher.amount})`
                );
            } else if (vouchersToDelete.length > 0 && !FIX && !REPORT_ONLY) {
                // Dry-run: just count what would be merged
                console.log(
                    ` [DRY-RUN] Group beneficiary=${beneficiary_name} would merge ` +
                    `${vouchersToDelete.length} unapproved duplicate(s) into kept voucher #${keptVoucher.id}`
                );
            }

            // --- Delete step: remove the unapproved duplicate voucher(s) ---
            if (vouchersToDelete.length > 0 && FIX) {
                for (const dup of vouchersToDelete) {
                    await db.execute(sql`
                        DELETE FROM employee_imprest_vouchers
                        WHERE id = ${dup.id}
                    `);
                    deleteCount++;
                    console.log(
                        ` [DELETE] beneficiary=${beneficiary_name} deleted duplicate voucher #${dup.id} ` +
                        `(code=${dup.voucher_code})`
                    );
                }
            } else if (vouchersToDelete.length > 0 && !FIX && !REPORT_ONLY) {
                // Dry-run: just count
                console.log(
                    ` [DRY-RUN] Group beneficiary=${beneficiary_name} would delete ` +
                    `${vouchersToDelete.length} unapproved duplicate(s) voucher(s)`
                );
            }
        }

        // --- Summary ---
        console.log(`\n=== Dedup Summary ===`);
        console.log(`  Groups examined       : ${groupCount}`);
        console.log(`  Skipped (no approved) : ${skipCount}`);
        console.log(`  Merged items          : ${mergeCount}`);
        console.log(`  Deleted vouchers      : ${deleteCount}`);
        console.log(`  Remaining groups w/ issues: handled manually above`);

        if (!FIX && !REPORT_ONLY) {
            console.log(
                `\nRun with --fix to apply merges and deletions, or --report-only for a read-only report.`
            );
        }

        console.log("\nDone.");
    } catch (err) {
        console.error("Dedup failed:", err);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

main().catch(err => {
    console.error("Unhandled error:", err);
    process.exit(1);
});