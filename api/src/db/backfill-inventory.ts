/**
 * Backfill warehouse inventory from all approved purchase orders and vendor work orders.
 *
 * Stores every line item of po_approved=true POs and wo_approved=true VWOs into the
 * inventory + inventory_movements tables using the exact same materialization logic as
 * live approvals. Idempotent: safe to re-run (documents that already have approval
 * movements are skipped).
 *
 * Usage:
 *   pnpm run backfill:inventory            # dry-run (prints what would happen)
 *   pnpm run backfill:inventory -- --apply # real run
 */
import "dotenv/config";
import { eq } from "drizzle-orm";
import { createPool, createDb } from "@/db";
import { purchaseOrders } from "@/db/schemas/operations/purchase-orders.schema";
import { purchaseOrderProducts } from "@/db/schemas/operations/purchase-order-products.schema";
import { vendorWorkOrders } from "@/db/schemas/operations/vendor-work-orders.schema";
import { vendorWorkOrderItems } from "@/db/schemas/operations/vendor-work-order-items.schema";
import { materializeApprovalLines, hasApprovalMovements } from "@/modules/operations/inventory/inventory.materialize";

const APPLY = process.argv.includes("--apply");

async function main() {
    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl) {
        console.error("DATABASE_URL not set — set it in the environment or .env.");
        process.exit(1);
    }

    const pool = createPool(dbUrl, 4, process.env.PGSSL === "true");
    const db = createDb(pool);

    console.log(`\nBackfill inventory (${APPLY ? "APPLY" : "dry-run"})`);

    const skipped = { po: 0, vwo: 0 };
    const lines = { po: 0, vwo: 0 };
    let inserted = 0;
    let updated = 0;

    try {
        const pos = await db
            .select({ id: purchaseOrders.id, projectId: purchaseOrders.projectId, poRaisedBy: purchaseOrders.poRaisedBy })
            .from(purchaseOrders)
            .where(eq(purchaseOrders.poApproved, true));

        for (const po of pos) {
            if (await hasApprovalMovements(db, "po", po.id)) {
                skipped.po++;
                continue;
            }
            const products = await db.select().from(purchaseOrderProducts).where(eq(purchaseOrderProducts.purchaseOrderId, po.id));
            if (!applicable(po.projectId, products.length)) {
                skipped.po++;
                continue;
            }
            lines.po += products.length;
            if (APPLY) {
                const result = await db.transaction(tx =>
                    materializeApprovalLines(tx, {
                        docType: "po",
                        projectId: po.projectId,
                        referenceId: po.id,
                        lines: products,
                        createdBy: po.poRaisedBy,
                    })
                );
                inserted += result.inserted;
                updated += result.updated;
            }
        }

        const vwos = await db
            .select({ id: vendorWorkOrders.id, projectId: vendorWorkOrders.projectId, woRaisedBy: vendorWorkOrders.woRaisedBy })
            .from(vendorWorkOrders)
            .where(eq(vendorWorkOrders.woApproved, true));

        for (const vwo of vwos) {
            if (await hasApprovalMovements(db, "vwo", vwo.id)) {
                skipped.vwo++;
                continue;
            }
            const items = await db.select().from(vendorWorkOrderItems).where(eq(vendorWorkOrderItems.vendorWorkOrderId, vwo.id));
            if (!applicable(vwo.projectId, items.length)) {
                skipped.vwo++;
                continue;
            }
            lines.vwo += items.length;
            if (APPLY) {
                const result = await db.transaction(tx =>
                    materializeApprovalLines(tx, {
                        docType: "vwo",
                        projectId: vwo.projectId,
                        referenceId: vwo.id,
                        lines: items,
                        createdBy: vwo.woRaisedBy,
                    })
                );
                inserted += result.inserted;
                updated += result.updated;
            }
        }

        console.log(`\nPOs  : ${pos.length - skipped.po} processed, ${skipped.po} skipped, ${lines.po} lines`);
        console.log(`VWOs : ${vwos.length - skipped.vwo} processed, ${skipped.vwo} skipped, ${lines.vwo} lines`);
        if (APPLY) {
            console.log(`In inventory: ${inserted} rows created, ${updated} rows merged`);
        } else {
            console.log(`Dry-run only — ${lines.po + lines.vwo} movements would be written. Re-run with --apply to commit.`);
        }
    } finally {
        await pool.end();
    }
}

function applicable(projectId: number | null, productCount: number): boolean {
    return !!projectId && productCount > 0;
}

main().catch(err => {
    console.error("Backfill failed:", err);
    process.exit(1);
});
