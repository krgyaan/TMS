import { Inject, Injectable } from "@nestjs/common";
import type { DbInstance } from "@/db";
import { DRIZZLE } from "@/db/database.module";
import { inventory } from "@/db/schemas/operations/inventory.schema";
import { inventoryMovements } from "@/db/schemas/operations/inventory-movements.schema";
import { warehouses } from "@/db/schemas/operations/warehouses.schema";
import type { WarehouseType } from "./inventory.warehouses";
import { users } from "@/db/schemas";
import { and, countDistinct, desc, eq, ilike, or, sql, type SQL } from "drizzle-orm";
import { projects } from "@/db/schemas/master/projects.schema";
import { purchaseOrders } from "@/db/schemas/operations/purchase-orders.schema";
import { vendorWorkOrders } from "@/db/schemas/operations/vendor-work-orders.schema";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { Logger } from "winston";

export type MovementType = "po_approval" | "transfer_in" | "transfer_out" | "sale_bill" | "dc_transfer" | "stock_voucher";
export type InventoryWarehouseFilter = "all" | WarehouseType | "ho_depot";

@Injectable()
export class InventoryService {
    constructor(
        @Inject(DRIZZLE) private readonly db: DbInstance,
        @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger
    ) {}

    async getProjectInventory(projectId: number, opts: { includeZero?: boolean; warehouseType?: InventoryWarehouseFilter } = {}) {
        const conditions: SQL[] = [eq(inventory.projectId, projectId)];
        if (!opts.includeZero) conditions.push(sql`${inventory.remainingQty}::numeric > 0`);
        if (opts.warehouseType && opts.warehouseType !== "all") {
            if (opts.warehouseType === "ho_depot") {
                const depotFilter = or(eq(warehouses.type, "ho_sub"), eq(warehouses.type, "ho_main"));
                if (depotFilter) conditions.push(depotFilter);
            } else {
                conditions.push(eq(warehouses.type, opts.warehouseType));
            }
        }

        const rows = await this.db
            .select({
                id: inventory.id,
                projectId: inventory.projectId,
                warehouseId: inventory.warehouseId,
                warehouseType: warehouses.type,
                warehouseName: warehouses.name,
                itemName: inventory.itemName,
                hsn: inventory.hsn,
                price: inventory.price,
                qty: inventory.qty,
                remainingQty: inventory.remainingQty,
                sourcePoNumber: sql<string | null>`(
                    SELECT po.po_number
                    FROM ${inventoryMovements} im
                    JOIN ${purchaseOrders} po ON po.id = im.po_id
                    WHERE im.inventory_id = ${inventory.id}
                      AND im.movement_type = 'po_approval'
                    ORDER BY im.id
                    LIMIT 1
                )`,
            })
            .from(inventory)
            .leftJoin(warehouses, eq(warehouses.id, inventory.warehouseId))
            .where(and(...conditions))
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
                sourcePoNumber: sql<string | null>`(
                    SELECT po.po_number
                    FROM ${inventoryMovements} im
                    JOIN ${purchaseOrders} po ON po.id = im.po_id
                    WHERE im.inventory_id = ${inventory.id}
                      AND im.movement_type = 'po_approval'
                    ORDER BY im.id
                    LIMIT 1
                )`,
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

    async getProjectSummaries(filters: { page?: number; limit?: number; search?: string } = {}) {
        const page = filters.page && filters.page > 0 ? filters.page : 1;
        const limit = filters.limit && filters.limit > 0 ? filters.limit : 50;
        const offset = (page - 1) * limit;

        const whereConditions: SQL[] = [];
        if (filters.search) {
            const pattern = `%${filters.search}%`;
            const searchFilter = or(ilike(projects.projectName, pattern), ilike(projects.projectCode, pattern));
            if (searchFilter) whereConditions.push(searchFilter);
        }
        const projectFilter = whereConditions.length > 0 ? and(...whereConditions) : undefined;

        const approvedPoCount = sql`(
            SELECT COUNT(*) FROM ${purchaseOrders} WHERE ${purchaseOrders.projectId} = ${projects.id} AND ${purchaseOrders.poApproved} = true
        )::int`;
        const approvedVwoCount = sql`(
            SELECT COUNT(*) FROM ${vendorWorkOrders} WHERE ${vendorWorkOrders.projectId} = ${projects.id} AND ${vendorWorkOrders.woApproved} = true
        )::int`;

        const [rows, [{ total }]] = await Promise.all([
            this.db
                .select({
                    projectId: projects.id,
                    projectName: projects.projectName,
                    projectCode: projects.projectCode,
                    approvedPoCount,
                    approvedVwoCount,
                    totalItems: sql`COUNT(${inventory.id})::int`,
                })
                .from(projects)
                .innerJoin(inventory, eq(inventory.projectId, projects.id))
                .where(projectFilter)
                .groupBy(projects.id, projects.projectName, projects.projectCode)
                .orderBy(projects.projectName, projects.id)
                .limit(limit)
                .offset(offset),
            this.db
                .select({ total: countDistinct(projects.id) })
                .from(projects)
                .innerJoin(inventory, eq(inventory.projectId, projects.id))
                .where(projectFilter),
        ]);

        return {
            data: rows.map(r => ({
                ...r,
                projectId: Number(r.projectId),
                approvedPoCount: Number(r.approvedPoCount),
                approvedVwoCount: Number(r.approvedVwoCount),
                totalItems: Number(r.totalItems),
            })),
            meta: {
                total: Number(total ?? 0),
                page,
                limit,
            },
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
                warehouseId: inventoryMovements.warehouseId,
                fromProjectId: inventoryMovements.fromProjectId,
                toProjectId: inventoryMovements.toProjectId,
                fromWarehouseId: inventoryMovements.fromWarehouseId,
                toWarehouseId: inventoryMovements.toWarehouseId,
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
