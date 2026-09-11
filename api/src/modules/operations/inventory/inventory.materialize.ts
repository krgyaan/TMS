import { and, eq, isNull, sql } from "drizzle-orm";
import type { DbInstance } from "@/db";
import { inventory } from "@/db/schemas/operations/inventory.schema";
import { inventoryMovements } from "@/db/schemas/operations/inventory-movements.schema";
import { purchaseOrders } from "@/db/schemas/operations/purchase-orders.schema";
import { purchaseOrderProducts } from "@/db/schemas/operations/purchase-order-products.schema";
import { purchaseInvoices } from "@/db/schemas/operations/purchase-invoices.schema";
import { resolveEntryWarehouseId } from "@/modules/operations/inventory/inventory.warehouses";

export type ApprovalLine = {
    id: number;
    description: string | null;
    hsnSac: string | null;
    qty: string | number;
    rate: string | number;
};

export type MaterializeOptions = {
    docType: "po" | "vwo";
    projectId: number;
    warehouseId: number;
    referenceId: number;
    lines: ApprovalLine[];
    createdBy?: number | null;
};

export type MaterializeResult = {
    skipped: boolean;
    inserted: number;
    updated: number;
    movements: number;
};

export async function hasApprovalMovements(tx: DbInstance, docType: "po" | "vwo", referenceId: number): Promise<boolean> {
    const existing = await tx
        .select({ id: inventoryMovements.id })
        .from(inventoryMovements)
        .where(
            docType === "po"
                ? and(eq(inventoryMovements.movementType, "po_approval"), eq(inventoryMovements.poId, referenceId))
                : and(eq(inventoryMovements.movementType, "vwo_approval"), eq(inventoryMovements.referenceId, referenceId), isNull(inventoryMovements.poId))
        );
    return existing.length > 0;
}

export async function materializeApprovalLines(tx: DbInstance, opts: MaterializeOptions): Promise<MaterializeResult> {
    const { docType, projectId, warehouseId, referenceId, lines, createdBy = null } = opts;
    if (!projectId || !warehouseId || lines.length === 0) return { skipped: false, inserted: 0, updated: 0, movements: 0 };

    const movementType = docType === "po" ? "po_approval" : "vwo_approval";
    const poId = docType === "po" ? referenceId : null;

    if (await hasApprovalMovements(tx, docType, referenceId)) {
        return { skipped: true, inserted: 0, updated: 0, movements: 0 };
    }

    let inserted = 0;
    let updated = 0;
    let movements = 0;

    for (const line of lines) {
        const itemName = (line.description ?? "Unnamed item").slice(0, 255);
        const hsn = line.hsnSac ?? "";
        const price = Number(line.rate);
        const qty = Number(line.qty);

        const existingRows = await tx
            .select()
            .from(inventory)
            .where(
                and(
                    eq(inventory.projectId, projectId),
                    eq(inventory.warehouseId, warehouseId),
                    eq(inventory.itemName, itemName),
                    sql`COALESCE(${inventory.hsn}, '') = COALESCE(${hsn}, '')`,
                    eq(inventory.price, price.toString())
                )
            )
            .then(rows => rows[0]);

        let inventoryId: number;
        if (existingRows) {
            const updatedRows = await tx
                .update(inventory)
                .set({
                    qty: (Number(existingRows.qty) + qty).toString(),
                    remainingQty: (Number(existingRows.remainingQty) + qty).toString(),
                    updatedAt: new Date(),
                })
                .where(eq(inventory.id, existingRows.id))
                .returning();
            inventoryId = updatedRows[0].id;
            updated++;
        } else {
            const insertedRows = await tx
                .insert(inventory)
                .values({
                    projectId,
                    warehouseId,
                    itemName,
                    hsn,
                    price: price.toString(),
                    qty: qty.toString(),
                    remainingQty: qty.toString(),
                    lineItem: line.id,
                })
                .returning();
            inventoryId = insertedRows[0].id;
            inserted++;
        }

        await tx.insert(inventoryMovements).values({
            inventoryId,
            projectId,
            warehouseId,
            movementType,
            referenceId,
            poId,
            fromProjectId: null,
            toProjectId: null,
            fromWarehouseId: null,
            toWarehouseId: null,
            qty: qty.toString(),
            price: price.toString(),
            itemName,
            hsn,
            createdBy: createdBy ?? null,
        });
        movements++;
    }

    return { skipped: false, inserted, updated, movements };
}

export async function poHasPurchaseInvoice(tx: DbInstance, poId: number): Promise<boolean> {
    const existing = await tx
        .select({ id: purchaseInvoices.id })
        .from(purchaseInvoices)
        .where(and(eq(purchaseInvoices.purchaseOrderId, poId), isNull(purchaseInvoices.vendorWorkOrderId)))
        .then(rows => rows[0]);
    return !!existing;
}

/**
 * Materialize a PO's line items into inventory, but only when the PO is approved AND no
 * approval movements exist yet (idempotent). Warehouse is derived from the PO shipping address.
 */
export async function tryMaterializePoInventory(tx: DbInstance, poId: number, createdBy?: number | null): Promise<MaterializeResult> {
    const po = await tx
        .select()
        .from(purchaseOrders)
        .where(eq(purchaseOrders.id, poId))
        .then(rows => rows[0]);
    if (!po || po.poApproved !== true || !po.projectId) return { skipped: true, inserted: 0, updated: 0, movements: 0 };

    if (await hasApprovalMovements(tx, "po", poId)) {
        return { skipped: true, inserted: 0, updated: 0, movements: 0 };
    }

    const products = await tx
        .select()
        .from(purchaseOrderProducts)
        .where(eq(purchaseOrderProducts.purchaseOrderId, poId));
    if (products.length === 0) return { skipped: true, inserted: 0, updated: 0, movements: 0 };

    const warehouseId = await resolveEntryWarehouseId(tx, po.projectId, {
        shippingAddress: po.shippingAddress,
        shipToName: po.shipToName,
    });

    return materializeApprovalLines(tx, {
        docType: "po",
        projectId: po.projectId,
        warehouseId,
        referenceId: po.id,
        lines: products,
        createdBy: createdBy ?? po.poRaisedBy,
    });
}