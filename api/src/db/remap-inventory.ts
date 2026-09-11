/**
 * Remap inventory to the warehouse dimension and purge VWO-origin stock.
 *
 * The new model (0135) only admits PO-origin stock, split per project into two warehouses:
 *   - ho_sub            -> items shipped to Volks Energie (own address)
 *   - project_location  -> items shipped to the project site (anything else)
 *   - ho_main           -> VEPL New Delhi HO's own stock (project 151)
 *
 * Steps:
 *   1. Ensure both warehouses exist for every project that holds inventory.
 *   2. Delete vwo_approval movements, then drop inventory rows with no movements left.
 *   3. Assign warehouse_id on remaining inventory rows + po_approval movements by the
 *      routing of each source PO's shipping address.
 *
 * Usage:
 *   pnpm run remap:inventory            # dry-run (prints what would happen)
 *   pnpm run remap:inventory -- --apply # real run
 */
import "dotenv/config";
import { eq, inArray, sql } from "drizzle-orm";
import { createPool, createDb } from "@/db";
import { inventory } from "@/db/schemas/operations/inventory.schema";
import { inventoryMovements } from "@/db/schemas/operations/inventory-movements.schema";
import { warehouses } from "@/db/schemas/operations/warehouses.schema";
import { purchaseOrders } from "@/db/schemas/operations/purchase-orders.schema";
import { ensureProjectWarehouses, resolveEntryWarehouseId, HO_PROJECT_ID } from "@/modules/operations/inventory/inventory.warehouses";

const APPLY = process.argv.includes("--apply");

async function main() {
    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl) {
        console.error("DATABASE_URL not set — set it in the environment or .env.");
        process.exit(1);
    }

    const pool = createPool(dbUrl, 4, process.env.PGSSL === "true");
    const db = createDb(pool);

    console.log(`\nRemap inventory to warehouses (${APPLY ? "APPLY" : "dry-run"})`);

    const run = async () => {
        const hoMain = await db
            .select({ id: warehouses.id })
            .from(warehouses)
            .where(eq(warehouses.type, "ho_main"))
            .then(rows => rows[0]);

        const projectsWithStock = await db
            .select({ projectId: inventory.projectId })
            .from(inventory)
            .groupBy(inventory.projectId);

        for (const p of projectsWithStock) {
            await ensureProjectWarehouses(db, p.projectId);
        }

        const vwoMovements = await db
            .select({ id: inventoryMovements.id })
            .from(inventoryMovements)
            .where(eq(inventoryMovements.movementType, "vwo_approval"));

        const orphanRows = await db
            .select({ id: inventory.id })
            .from(inventory)
            .where(
                sql`NOT EXISTS (
                    SELECT 1 FROM inventory_movements im
                    WHERE im.inventory_id = ${inventory.id} AND im.movement_type <> 'vwo_approval'
                )`
            );

        const poMovements = await db
            .select({
                id: inventoryMovements.id,
                inventoryId: inventoryMovements.inventoryId,
                poId: inventoryMovements.poId,
            })
            .from(inventoryMovements)
            .where(eq(inventoryMovements.movementType, "po_approval"));

        const poIds = [...new Set(poMovements.map(m => m.poId).filter((v): v is number => !!v))];
        const pos = poIds.length
            ? await db
                  .select({ id: purchaseOrders.id, projectId: purchaseOrders.projectId, shippingAddress: purchaseOrders.shippingAddress, shipToName: purchaseOrders.shipToName })
                  .from(purchaseOrders)
                  .where(inArray(purchaseOrders.id, poIds))
            : [];
        const poRoutes = new Map<number, { projectId: number; warehouseId: number }>();
        for (const po of pos) {
            poRoutes.set(po.id, {
                projectId: po.projectId,
                warehouseId: await resolveEntryWarehouseId(db, po.projectId, { shippingAddress: po.shippingAddress, shipToName: po.shipToName }),
            });
        }

        const assignments = new Map<number, { projectId: number; warehouseId: number }>();
        for (const m of poMovements) {
            const route = poRoutes.get(m.poId ?? 0);
            if (!route || m.inventoryId === null) continue;
            if (!assignments.has(m.inventoryId)) {
                assignments.set(m.inventoryId, { projectId: route.projectId, warehouseId: route.warehouseId });
            }
        }

        const assignedTypes: Record<string, number> = {};
        for (const a of assignments.values()) {
            const w = await db.select({ type: warehouses.type }).from(warehouses).where(eq(warehouses.id, a.warehouseId)).then(r => r[0]);
            assignedTypes[w?.type ?? "unknown"] = (assignedTypes[w?.type ?? "unknown"] ?? 0) + 1;
        }

        console.log(`\n- ho_main warehouse       : ${hoMain ? `#${hoMain.id}` : "MISSING (run migrations 0135 first)"}`);
        console.log(`- projects with stock     : ${projectsWithStock.length} (warehouses ensured)`);
        console.log(`- vwo_approval to delete  : ${vwoMovements.length}`);
        console.log(`- orphan rows to delete   : ${orphanRows.length}`);
        console.log(`- po_approval to assign   : ${poMovements.length}`);
        console.log(`- inventory rows assigned : ${assignments.size}`);
        console.log(`- rows by warehouse type  : ${JSON.stringify(assignedTypes)}`);

        if (!hoMain) return;

        if (!APPLY) {
            console.log(`\nDry-run only. Re-run with --apply to commit.`);
            return;
        }

        await db.transaction(async tx => {
            await tx.delete(inventoryMovements).where(eq(inventoryMovements.movementType, "vwo_approval"));

            const orphans = await tx
                .select({ id: inventory.id })
                .from(inventory)
                .where(
                    sql`${inventory.id} NOT IN (SELECT COALESCE(inventory_id, 0) FROM inventory_movements)`
                );
            for (const r of orphans) {
                await tx.delete(inventory).where(eq(inventory.id, r.id));
            }

            for (const m of poMovements) {
                const route = poRoutes.get(m.poId ?? 0);
                if (!route) continue;
                await tx.update(inventoryMovements).set({ warehouseId: route.warehouseId }).where(eq(inventoryMovements.id, m.id));
            }
            for (const [inventoryId, a] of assignments) {
                await tx.update(inventory).set({ warehouseId: a.warehouseId }).where(eq(inventory.id, inventoryId));
            }

            const unassigned = await tx.select().from(inventory).where(sql`${inventory.warehouseId} IS NULL`);
            for (const inv of unassigned) {
                const w = inv.projectId === HO_PROJECT_ID ? hoMain.id : (await ensureProjectWarehouses(tx, inv.projectId)).projectLocation.id;
                await tx.update(inventory).set({ warehouseId: w }).where(eq(inventory.id, inv.id));
            }

            const unassignedMovements = await tx
                .select({ id: inventoryMovements.id, inventoryId: inventoryMovements.inventoryId })
                .from(inventoryMovements)
                .where(sql`${inventoryMovements.warehouseId} IS NULL`);
            for (const m of unassignedMovements) {
                if (m.inventoryId === null) continue;
                const row = await tx
                    .select({ warehouseId: inventory.warehouseId })
                    .from(inventory)
                    .where(eq(inventory.id, m.inventoryId))
                    .then(r => r[0]);
                if (!row?.warehouseId) continue;
                await tx.update(inventoryMovements).set({ warehouseId: row.warehouseId }).where(eq(inventoryMovements.id, m.id));
            }
        });

        console.log(`\nRemap applied.`);
    };

    try {
        await run();
    } finally {
        await pool.end();
    }
}

main().catch(err => {
    console.error("Remap failed:", err);
    process.exit(1);
});