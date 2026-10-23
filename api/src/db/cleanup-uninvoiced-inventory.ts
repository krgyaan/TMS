/**
 * Remove inventory stock whose source PO has no purchase invoice.
 *
 * Rule: an item only enters inventory after an invoice is uploaded against its PO.
 * Stock created before that gate existed (or from POs that were never invoiced) is
 * un-invoiced and must be removed. Affected POs re-materialize automatically the
 * moment an invoice is uploaded (tryMaterializePoInventory is idempotent).
 *
 * Steps:
 *   1. Find every po_approval movement whose PO has zero rows in
 *      project_purchase_invoices (or has no PO link at all).
 *   2. Decrement qty/remainingQty on the touched inventory rows (rows can aggregate
 *      several POs via the unique key, so only the stale PO's qty is removed).
 *   3. Delete those movements.
 *   4. Remove transfer pairs whose source row died above: a transfer_out out of a
 *      dead row takes its transfer_in destination (and the transfer record) with it,
 *      since that stock is un-invoiced too.
 *   5. Delete inventory rows left with no movements (including pre-existing orphans).
 *
 * Usage:
 *   pnpm run cleanup:uninvoiced-inventory             # dry-run (prints what would happen)
 *   pnpm run cleanup:uninvoiced-inventory -- --apply  # real run
 */
import "dotenv/config";
import { and, eq, inArray, sql, type SQL } from "drizzle-orm";
import { createPool, createDb, type DbInstance } from "@/db";
import { inventory } from "@/db/schemas/operations/inventory.schema";
import { inventoryMovements } from "@/db/schemas/operations/inventory-movements.schema";
import { inventoryTransfers } from "@/db/schemas/operations/inventory-transfers.schema";
import { purchaseOrders } from "@/db/schemas/operations/purchase-orders.schema";
import { purchaseInvoices } from "@/db/schemas/operations/purchase-invoices.schema";

const APPLY = process.argv.includes("--apply");

/** A po_approval movement is stale when its PO has no purchase invoice (or no PO link). */
const staleCondition = (m: { poId: typeof inventoryMovements.poId }): SQL =>
    sql`(${m.poId} IS NULL OR NOT EXISTS (
        SELECT 1 FROM ${purchaseInvoices} pi WHERE pi.purchase_order_id = ${m.poId}
    ))`;

const STALE_MOVEMENT = staleCondition(inventoryMovements);

function chunk<T>(items: T[], size: number): T[][] {
    const out: T[][] = [];
    for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
    return out;
}

/**
 * Rows that end up at qty 0 after the stale decrements and have no surviving
 * po_approval movement — dead sources for transfer purposes.
 *
 * Dead rows necessarily carry stale movements, so candidates are the rows the
 * stale movements touch.
 */
async function findDeadSourceRows(db: DbInstance, candidateIds: number[], staleMovementIds: Set<number>): Promise<number[]> {
    if (candidateIds.length === 0) return [];

    const movements = await db
        .select({ id: inventoryMovements.id, inventoryId: inventoryMovements.inventoryId, qty: inventoryMovements.qty })
        .from(inventoryMovements)
        .where(and(inArray(inventoryMovements.inventoryId, candidateIds), eq(inventoryMovements.movementType, "po_approval")));

    const rows = await db
        .select({ id: inventory.id, qty: inventory.qty, remainingQty: inventory.remainingQty })
        .from(inventory)
        .where(inArray(inventory.id, candidateIds));

    const dead: number[] = [];
    for (const row of rows) {
        const rowMovements = movements.filter(m => m.inventoryId === row.id);
        if (rowMovements.length === 0) continue;
        const staleSum = rowMovements.filter(m => staleMovementIds.has(m.id)).reduce((sum, m) => sum + Number(m.qty), 0);
        const surviving = rowMovements.filter(m => !staleMovementIds.has(m.id)).length;
        if (Number(row.qty) <= staleSum && Number(row.remainingQty) <= staleSum && surviving === 0) dead.push(row.id);
    }
    return dead;
}

async function main() {
    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl) {
        console.error("DATABASE_URL not set — set it in the environment or .env.");
        process.exit(1);
    }

    const pool = createPool(dbUrl, 4, process.env.PGSSL === "true");
    const db = createDb(pool);

    console.log(`\nCleanup un-invoiced inventory (${APPLY ? "APPLY" : "dry-run"})`);

    const run = async () => {
        const staleMovements = await db
            .select({
                id: inventoryMovements.id,
                inventoryId: inventoryMovements.inventoryId,
                poId: inventoryMovements.poId,
                qty: inventoryMovements.qty,
                poNumber: purchaseOrders.poNumber,
            })
            .from(inventoryMovements)
            .leftJoin(purchaseOrders, eq(purchaseOrders.id, inventoryMovements.poId))
            .where(and(eq(inventoryMovements.movementType, "po_approval"), STALE_MOVEMENT));

        const preExistingOrphans = await db
            .select({ id: inventory.id, projectId: inventory.projectId, itemName: inventory.itemName, qty: inventory.qty })
            .from(inventory)
            .where(sql`NOT EXISTS (SELECT 1 FROM ${inventoryMovements} im WHERE im.inventory_id = ${inventory.id})`);

        const byPo = new Map<number, { poNumber: string | null; movements: number; qty: number; rows: Set<number> }>();
        const byInventory = new Map<number, number>();
        for (const m of staleMovements) {
            const key = m.poId ?? 0;
            const entry = byPo.get(key) ?? { poNumber: m.poNumber, movements: 0, qty: 0, rows: new Set<number>() };
            entry.movements += 1;
            entry.qty += Number(m.qty);
            if (m.inventoryId !== null) {
                entry.rows.add(m.inventoryId);
                byInventory.set(m.inventoryId, (byInventory.get(m.inventoryId) ?? 0) + Number(m.qty));
            }
            byPo.set(key, entry);
        }

        const stalePoIds = [...byPo.keys()].filter(id => id !== 0);
        const posWithStaleStock = stalePoIds.length
            ? await db
                  .select({ id: purchaseOrders.id, poNumber: purchaseOrders.poNumber })
                  .from(purchaseOrders)
                  .where(inArray(purchaseOrders.id, stalePoIds))
            : [];
        const posWithStale = new Set(posWithStaleStock.map(p => p.id));

        const deadSourceIds = await findDeadSourceRows(
            db,
            [...byInventory.keys()],
            new Set(staleMovements.map(m => m.id))
        );

        const outgoing = deadSourceIds.length
            ? await db
                  .select({
                      id: inventoryMovements.id,
                      inventoryId: inventoryMovements.inventoryId,
                      referenceId: inventoryMovements.referenceId,
                      fromProjectId: inventoryMovements.fromProjectId,
                      toProjectId: inventoryMovements.toProjectId,
                      qty: inventoryMovements.qty,
                      itemName: inventoryMovements.itemName,
                  })
                  .from(inventoryMovements)
                  .where(and(eq(inventoryMovements.movementType, "transfer_out"), inArray(inventoryMovements.inventoryId, deadSourceIds)))
            : [];

        const incoming: typeof outgoing = [];
        const transferDestIds = new Set<number>();
        for (const out of outgoing) {
            const paired = await db
                .select({
                    id: inventoryMovements.id,
                    inventoryId: inventoryMovements.inventoryId,
                    referenceId: inventoryMovements.referenceId,
                    fromProjectId: inventoryMovements.fromProjectId,
                    toProjectId: inventoryMovements.toProjectId,
                    qty: inventoryMovements.qty,
                    itemName: inventoryMovements.itemName,
                })
                .from(inventoryMovements)
                .where(
                    and(
                        eq(inventoryMovements.movementType, "transfer_in"),
                        eq(inventoryMovements.referenceId, out.referenceId ?? -1),
                        eq(inventoryMovements.fromProjectId, out.fromProjectId ?? -1),
                        eq(inventoryMovements.toProjectId, out.toProjectId ?? -1)
                    )
                );
            for (const p of paired) {
                incoming.push(p);
                if (p.inventoryId !== null) transferDestIds.add(p.inventoryId);
            }
        }

        const destRows = transferDestIds.size
            ? await db
                  .select({ id: inventory.id, projectId: inventory.projectId, itemName: inventory.itemName, qty: inventory.qty })
                  .from(inventory)
                  .where(inArray(inventory.id, [...transferDestIds]))
            : [];
        const destDeletable: number[] = [];
        for (const r of destRows) {
            const hasPo = await db
                .select({ id: inventoryMovements.id })
                .from(inventoryMovements)
                .where(and(eq(inventoryMovements.inventoryId, r.id), eq(inventoryMovements.movementType, "po_approval")))
                .then(rows => rows.length > 0);
            if (!hasPo) destDeletable.push(r.id);
        }

        const staleTransferIds = [...new Set([...outgoing, ...incoming].map(m => m.id))];
        const staleTransferRecordIds = deadSourceIds.length
            ? await db
                  .select({ id: inventoryTransfers.id })
                  .from(inventoryTransfers)
                  .where(inArray(inventoryTransfers.itemId, deadSourceIds))
                  .then(rows => rows.map(r => r.id))
            : [];

        console.log(`\n- un-invoiced POs with stock : ${posWithStale.size}`);
        console.log(`- movements to delete        : ${staleMovements.length}`);
        console.log(`- inventory rows to adjust   : ${byInventory.size}`);
        console.log(`- orphan rows (no movements) : ${preExistingOrphans.length}`);
        console.log(`- movement rows with no PO   : ${byPo.has(0) ? byPo.get(0)!.movements : 0}`);
        console.log(`- dead rows (qty -> 0)       : ${deadSourceIds.length}`);
        console.log(`- transfer pairs to remove   : ${outgoing.length} (dest rows ${destDeletable.length})`);
        console.log(`- transfer records to remove : ${staleTransferRecordIds.length}`);

        if (staleMovements.length > 0) {
            console.log("\nPer-PO breakdown:");
            for (const [poId, e] of [...byPo.entries()].sort((a, b) => a[0] - b[0])) {
                const label = poId === 0 ? "(no PO link)" : `PO #${poId} ${e.poNumber ?? "(missing PO)"}`;
                console.log(`  ${label}: ${e.movements} movement(s), qty ${e.qty.toFixed(2)}, inventory rows ${e.rows.size}`);
            }
        }
        if (deadSourceIds.length > 0) {
            console.log("\nDead source rows (un-invoiced qty fully consumed by stale movements):");
            const details = await db
                .select({ id: inventory.id, projectId: inventory.projectId, itemName: inventory.itemName, qty: inventory.qty })
                .from(inventory)
                .where(inArray(inventory.id, deadSourceIds));
            for (const d of details) console.log(`  inventory #${d.id} (project ${d.projectId}, qty ${d.qty}): ${d.itemName.slice(0, 60).replace(/\n/g, " ")}`);
        }
        if (incoming.length > 0) {
            console.log("\nTransfer destinations to remove:");
            for (const m of incoming) console.log(`  inventory #${m.inventoryId} (ref ${m.referenceId}, qty ${m.qty}): ${m.itemName.slice(0, 60).replace(/\n/g, " ")}`);
        }
        if (preExistingOrphans.length > 0) {
            console.log("\nOrphan inventory rows to delete:");
            for (const o of preExistingOrphans) {
                console.log(`  inventory #${o.id} (project ${o.projectId}, qty ${o.qty}): ${o.itemName.slice(0, 60).replace(/\n/g, " ")}`);
            }
        }

        if (!APPLY) {
            console.log(`\nDry-run only. Re-run with --apply to commit.`);
            return;
        }

        await db.transaction(async tx => {
            for (const [inventoryId, qty] of byInventory) {
                await tx
                    .update(inventory)
                    .set({
                        qty: sql`GREATEST(${inventory.qty} - ${qty}, 0)`,
                        remainingQty: sql`GREATEST(${inventory.remainingQty} - ${qty}, 0)`,
                        updatedAt: new Date(),
                    })
                    .where(eq(inventory.id, inventoryId));
            }

            const movementIds = staleMovements.map(m => m.id);
            for (const ids of chunk(movementIds, 500)) {
                await tx.delete(inventoryMovements).where(inArray(inventoryMovements.id, ids));
            }

            if (destDeletable.length > 0) {
                await tx.delete(inventory).where(inArray(inventory.id, destDeletable));
            }
            if (staleTransferIds.length > 0) {
                await tx.delete(inventoryMovements).where(inArray(inventoryMovements.id, staleTransferIds));
            }
            if (deadSourceIds.length > 0) {
                if (staleTransferRecordIds.length > 0) {
                    await tx.delete(inventoryTransfers).where(inArray(inventoryTransfers.id, staleTransferRecordIds));
                }
                await tx.delete(inventory).where(inArray(inventory.id, deadSourceIds));
            }

            const orphanIds = await tx
                .select({ id: inventory.id })
                .from(inventory)
                .where(sql`NOT EXISTS (SELECT 1 FROM ${inventoryMovements} im WHERE im.inventory_id = ${inventory.id})`);
            for (const ids of chunk(orphanIds.map(o => o.id), 500)) {
                await tx.delete(inventory).where(inArray(inventory.id, ids));
            }

            console.log(
                `\nApplied: ${byInventory.size} inventory row(s) decremented, ${movementIds.length} po_approval movement(s) deleted, ` +
                    `${deadSourceIds.length} dead row(s) + ${destDeletable.length} transfer dest row(s) deleted, ` +
                    `${staleTransferIds.length} transfer movement(s) deleted, ${orphanIds.length} orphan row(s) deleted.`
            );
        });
    };

    try {
        await run();
    } finally {
        await pool.end();
    }
}

main().catch(err => {
    console.error("Cleanup failed:", err);
    process.exit(1);
});
