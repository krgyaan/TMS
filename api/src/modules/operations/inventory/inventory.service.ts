import { BadRequestException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import type { DbInstance } from "@/db";
import { DRIZZLE } from "@/db/database.module";
import { inventory, type NewInventory } from "@/db/schemas/operations/inventory.schema";
import { inventoryMovements } from "@/db/schemas/operations/inventory-movements.schema";
import { inventoryTransfers } from "@/db/schemas/operations/inventory-transfers.schema";
import { users } from "@/db/schemas";
import { and, desc, eq, sql, isNull } from "drizzle-orm";
import { projects } from "@/db/schemas/master/projects.schema";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { Logger } from "winston";

export type MovementType = "po_approval" | "transfer_in" | "transfer_out" | "sale_bill";

@Injectable()
export class InventoryService {
    constructor(
        @Inject(DRIZZLE) private readonly db: DbInstance,
        @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger
    ) {}

    async getProjectInventory(projectId: number, opts: { includeZero?: boolean } = {}) {
        const rows = await this.db
            .select({
                id: inventory.id,
                projectId: inventory.projectId,
                itemName: inventory.itemName,
                hsn: inventory.hsn,
                price: inventory.price,
                qty: inventory.qty,
                remainingQty: inventory.remainingQty,
            })
            .from(inventory)
            .where(opts.includeZero ? eq(inventory.projectId, projectId) : and(eq(inventory.projectId, projectId), sql`${inventory.remainingQty}::numeric > 0`))
            .orderBy(inventory.itemName, inventory.id);

        return {
            items: rows.map(r => ({
                ...r,
                price: Number(r.price),
                qty: Number(r.qty),
                remainingQty: Number(r.remainingQty),
            })),
        };
    }

    async getAllInventory(opts: { includeZero?: boolean } = {}) {
        const whereCondition = opts.includeZero ? undefined : sql`${inventory.remainingQty}::numeric > 0`;

        const rows = await this.db
            .select({
                id: inventory.id,
                projectId: inventory.projectId,
                projectName: projects.projectName,
                itemName: inventory.itemName,
                hsn: inventory.hsn,
                price: inventory.price,
                qty: inventory.qty,
                remainingQty: inventory.remainingQty,
            })
            .from(inventory)
            .leftJoin(projects, eq(projects.id, inventory.projectId))
            .where(whereCondition)
            .orderBy(projects.projectName, inventory.itemName, inventory.id);

        return {
            items: rows.map(r => ({
                ...r,
                price: Number(r.price),
                qty: Number(r.qty),
                remainingQty: Number(r.remainingQty),
            })),
        };
    }

    async transfer(
        dto: {
            itemId: number;
            fromProject: number;
            toProject: number;
            qty: number;
            price?: number;
            remark?: string;
        },
        userId?: number
    ) {
        const { itemId, fromProject, toProject, qty } = dto;
        if (qty <= 0) {
            throw new BadRequestException("Transfer qty must be greater than zero");
        }
        if (fromProject === toProject) {
            throw new BadRequestException("Source and destination projects cannot be the same");
        }

        const transfer = await this.db.transaction(async tx => {
            const [source] = (await (tx as any).select().from(inventory).where(eq(inventory.id, itemId)).for("update")) as any[];

            if (!source) {
                throw new NotFoundException("Source inventory item not found");
            }
            if (Number(source.projectId) !== Number(fromProject)) {
                throw new BadRequestException("Source item does not belong to the given project");
            }

            const sourceRemaining = Number(source.remainingQty);
            if (qty > sourceRemaining) {
                throw new BadRequestException(`Insufficient remaining qty: available ${sourceRemaining}, requested ${qty}`);
            }

            const price = dto.price ?? Number(source.price);
            const itemName = source.itemName;
            const hsn = source.hsn;

            const [target] = (await tx
                .select()
                .from(inventory)
                .where(
                    and(
                        eq(inventory.projectId, toProject),
                        eq(inventory.itemName, itemName),
                        sql`COALESCE(${inventory.hsn}, '') = COALESCE(${hsn ?? ""}, '')`,
                        eq(inventory.price, price.toString())
                    )
                )) as any[];

            let targetInventoryId: number;

            if (target) {
                const targetQty = Number(target.qty);
                const targetRemaining = Number(target.remainingQty);
                await tx
                    .update(inventory)
                    .set({
                        qty: (targetQty + qty).toString(),
                        remainingQty: (targetRemaining + qty).toString(),
                        updatedAt: new Date(),
                    })
                    .where(eq(inventory.id, target.id));
                targetInventoryId = Number(target.id);
            } else {
                const [created] = (await tx
                    .insert(inventory)
                    .values({
                        projectId: toProject,
                        itemName,
                        hsn: hsn ?? null,
                        price: price.toString(),
                        qty: qty.toString(),
                        remainingQty: qty.toString(),
                        lineItem: source.lineItem,
                    })
                    .returning()) as any[];
                targetInventoryId = Number(created.id);
            }

            await tx
                .update(inventory)
                .set({
                    remainingQty: (sourceRemaining - qty).toString(),
                    updatedAt: new Date(),
                })
                .where(eq(inventory.id, itemId));

            const [transferRecord] = (await tx
                .insert(inventoryTransfers)
                .values({
                    itemId,
                    fromProject,
                    toProject,
                    qty: qty.toString(),
                    price: price.toString(),
                    remark: dto.remark ?? null,
                    transferredBy: userId ?? null,
                })
                .returning()) as any[];

            await tx.insert(inventoryMovements).values([
                {
                    inventoryId: itemId,
                    projectId: fromProject,
                    movementType: "transfer_out",
                    referenceId: Number(transferRecord.id),
                    fromProjectId: fromProject,
                    toProjectId: toProject,
                    qty: (-qty).toString(),
                    price: price.toString(),
                    itemName,
                    hsn: hsn ?? null,
                    createdBy: userId ?? null,
                },
                {
                    inventoryId: targetInventoryId,
                    projectId: toProject,
                    movementType: "transfer_in",
                    referenceId: Number(transferRecord.id),
                    fromProjectId: fromProject,
                    toProjectId: toProject,
                    qty: qty.toString(),
                    price: price.toString(),
                    itemName,
                    hsn: hsn ?? null,
                    createdBy: userId ?? null,
                },
            ]);

            return transferRecord;
        });

        this.logger.info(`Inventory transfer #${transfer.id}: ${qty} x "${transfer.price}" from project ${fromProject} to ${toProject}`);
        return transfer;
    }

    async getTransfers(fromProject?: number, toProject?: number) {
        const conditions: any[] = [];
        if (fromProject) conditions.push(eq(inventoryTransfers.fromProject, fromProject));
        if (toProject) conditions.push(eq(inventoryTransfers.toProject, toProject));

        const rows = await this.db
            .select({
                id: inventoryTransfers.id,
                itemId: inventoryTransfers.itemId,
                fromProject: inventoryTransfers.fromProject,
                toProject: inventoryTransfers.toProject,
                qty: inventoryTransfers.qty,
                price: inventoryTransfers.price,
                remark: inventoryTransfers.remark,
                transferredBy: users.name,
                createdAt: inventoryTransfers.createdAt,
                itemName: inventory.itemName,
                hsn: inventory.hsn,
            })
            .from(inventoryTransfers)
            .leftJoin(inventory, eq(inventory.id, inventoryTransfers.itemId))
            .leftJoin(users, eq(users.id, inventoryTransfers.transferredBy))
            .where(conditions.length ? and(...conditions) : undefined)
            .orderBy(desc(inventoryTransfers.createdAt));

        return {
            items: rows.map(r => ({
                ...r,
                qty: Number(r.qty),
                price: Number(r.price),
            })),
        };
    }

    async getMovements(projectId?: number, inventoryId?: number) {
        const conditions: any[] = [];
        if (projectId) conditions.push(eq(inventoryMovements.projectId, projectId));
        if (inventoryId) conditions.push(eq(inventoryMovements.inventoryId, inventoryId));

        const rows = await this.db
            .select({
                id: inventoryMovements.id,
                inventoryId: inventoryMovements.inventoryId,
                projectId: inventoryMovements.projectId,
                movementType: inventoryMovements.movementType,
                referenceId: inventoryMovements.referenceId,
                fromProjectId: inventoryMovements.fromProjectId,
                toProjectId: inventoryMovements.toProjectId,
                poId: inventoryMovements.poId,
                qty: inventoryMovements.qty,
                price: inventoryMovements.price,
                itemName: inventoryMovements.itemName,
                hsn: inventoryMovements.hsn,
                createdBy: users.name,
                createdAt: inventoryMovements.createdAt,
            })
            .from(inventoryMovements)
            .leftJoin(users, eq(users.id, inventoryMovements.createdBy))
            .where(conditions.length ? and(...conditions) : undefined)
            .orderBy(desc(inventoryMovements.createdAt));

        return {
            items: rows.map(r => ({
                ...r,
                qty: Number(r.qty),
                price: Number(r.price),
            })),
        };
    }
}
