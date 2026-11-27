import {
    BadRequestException,
    ConflictException,
    Inject,
    Injectable,
    NotFoundException,
} from "@nestjs/common";
import { and, asc, desc, eq, gte, lte, sql } from "drizzle-orm";
import { DRIZZLE } from "@/db/database.module";
import type { DbInstance } from "@/db";
import {
    officeInventoryItems,
    officeInventoryPurchases,
    officeInventoryConsumptions,
    officeEquipment,
    officeEquipmentLogs,
    officeAppliances,
    officeApplianceServices,
    officeApplianceCleanings,
} from "@/db/schemas/hrms/office-inventory.schema";
import type {
    CreateItemDto,
    UpdateItemDto,
    CreatePurchaseDto,
    UpdatePurchaseDto,
    CreateConsumptionDto,
    UpdateConsumptionDto,
    CreateEquipmentDto,
    UpdateEquipmentDto,
    CreateEquipmentLogDto,
    UpdateEquipmentLogDto,
    CreateApplianceDto,
    UpdateApplianceDto,
    CreateApplianceServiceDto,
    UpdateApplianceServiceDto,
    CreateApplianceCleaningDto,
    UpdateApplianceCleaningDto,
} from "./dto/office-inventory.dto";
import {
    ITEM_CATEGORY_PREFIX,
    EQUIPMENT_CATEGORY_PREFIX,
    addDaysIso,
    computeEquipmentQty,
    computeItemStock,
    computeNextCleaningDue,
    generateNextCode,
    getCurrentWeekBounds,
    monthEndIso,
    round2,
    toNum,
} from "./office-inventory.helpers";

@Injectable()
export class OfficeInventoryService {
    constructor(@Inject(DRIZZLE) private readonly db: DbInstance) {}

    // =========================================================================
    // 1. ITEM MASTER
    // =========================================================================

    async getNextItemCode(category: string): Promise<{ code: string }> {
        const prefix = ITEM_CATEGORY_PREFIX[category];
        if (!prefix) {
            throw new BadRequestException(`Unsupported category: ${category}`);
        }
        const rows = await this.db
            .select({ itemCode: officeInventoryItems.itemCode })
            .from(officeInventoryItems);
        return { code: generateNextCode(prefix, rows.map(r => r.itemCode)) };
    }

    async listItems() {
        const purchaseAgg = this.db
            .select({
                itemId: officeInventoryPurchases.itemId,
                totalQty: sql<string>`COALESCE(SUM(${officeInventoryPurchases.qtyPurchased}), 0)`.as(
                    "purchased_qty"
                ),
            })
            .from(officeInventoryPurchases)
            .groupBy(officeInventoryPurchases.itemId)
            .as("purchase_agg");

        const consumptionAgg = this.db
            .select({
                itemId: officeInventoryConsumptions.itemId,
                totalQty: sql<string>`COALESCE(SUM(${officeInventoryConsumptions.qtyIssued}), 0)`.as(
                    "consumed_qty"
                ),
            })
            .from(officeInventoryConsumptions)
            .groupBy(officeInventoryConsumptions.itemId)
            .as("consumption_agg");

        const rows = await this.db
            .select({
                id: officeInventoryItems.id,
                category: officeInventoryItems.category,
                itemCode: officeInventoryItems.itemCode,
                itemName: officeInventoryItems.itemName,
                unit: officeInventoryItems.unit,
                minStockLevel: officeInventoryItems.minStockLevel,
                openingStock: officeInventoryItems.openingStock,
                createdAt: officeInventoryItems.createdAt,
                updatedAt: officeInventoryItems.updatedAt,
                totalPurchased: sql<string>`COALESCE(${purchaseAgg.totalQty}, 0)`,
                totalConsumed: sql<string>`COALESCE(${consumptionAgg.totalQty}, 0)`,
            })
            .from(officeInventoryItems)
            .leftJoin(purchaseAgg, eq(officeInventoryItems.id, purchaseAgg.itemId))
            .leftJoin(consumptionAgg, eq(officeInventoryItems.id, consumptionAgg.itemId))
            .orderBy(asc(officeInventoryItems.itemCode));

        return rows.map(item => {
            const openingStock = toNum(item.openingStock);
            const minStockLevel = toNum(item.minStockLevel);
            const totalPurchased = toNum(item.totalPurchased);
            const totalConsumed = toNum(item.totalConsumed);
            const { currentStock, status } = computeItemStock(
                openingStock,
                totalPurchased,
                totalConsumed,
                minStockLevel
            );
            return {
                id: item.id,
                category: item.category,
                itemCode: item.itemCode,
                itemName: item.itemName,
                unit: item.unit,
                minStockLevel,
                openingStock,
                totalPurchased: round2(totalPurchased),
                totalConsumed: round2(totalConsumed),
                currentStock,
                status,
                createdAt: item.createdAt,
                updatedAt: item.updatedAt,
            };
        });
    }

    async createItem(userId: number, dto: CreateItemDto) {
        const code =
            dto.itemCode?.trim().toUpperCase() ||
            (await this.getNextItemCode(dto.category)).code;

        const existing = await this.db
            .select({ id: officeInventoryItems.id })
            .from(officeInventoryItems)
            .where(eq(officeInventoryItems.itemCode, code))
            .limit(1);
        if (existing.length > 0) {
            throw new ConflictException(`Item code "${code}" already exists`);
        }

        const [created] = await this.db
            .insert(officeInventoryItems)
            .values({
                category: dto.category,
                itemCode: code,
                itemName: dto.itemName,
                unit: dto.unit,
                minStockLevel: String(dto.minStockLevel),
                openingStock: String(dto.openingStock),
                createdBy: userId,
            })
            .returning();

        return created;
    }

    async updateItem(id: number, dto: UpdateItemDto) {
        const [existing] = await this.db
            .select()
            .from(officeInventoryItems)
            .where(eq(officeInventoryItems.id, id))
            .limit(1);
        if (!existing) throw new NotFoundException(`Item #${id} not found`);

        const nextCode = dto.itemCode ? dto.itemCode.trim().toUpperCase() : undefined;
        if (nextCode && nextCode !== existing.itemCode) {
            const dup = await this.db
                .select({ id: officeInventoryItems.id })
                .from(officeInventoryItems)
                .where(eq(officeInventoryItems.itemCode, nextCode))
                .limit(1);
            if (dup.length > 0) {
                throw new ConflictException(`Item code "${nextCode}" already exists`);
            }
        }

        const [updated] = await this.db
            .update(officeInventoryItems)
            .set({
                ...(dto.category !== undefined ? { category: dto.category } : {}),
                ...(nextCode !== undefined ? { itemCode: nextCode } : {}),
                ...(dto.itemName !== undefined ? { itemName: dto.itemName } : {}),
                ...(dto.unit !== undefined ? { unit: dto.unit } : {}),
                ...(dto.minStockLevel !== undefined
                    ? { minStockLevel: String(dto.minStockLevel) }
                    : {}),
                ...(dto.openingStock !== undefined
                    ? { openingStock: String(dto.openingStock) }
                    : {}),
                updatedAt: new Date(),
            })
            .where(eq(officeInventoryItems.id, id))
            .returning();

        return updated;
    }

    async deleteItem(id: number) {
        const [row] = await this.db
            .select({
                id: officeInventoryItems.id,
                purchaseCount: sql<number>`(SELECT COUNT(*)::int FROM ${officeInventoryPurchases} WHERE ${officeInventoryPurchases.itemId} = ${officeInventoryItems.id})`,
                consumptionCount: sql<number>`(SELECT COUNT(*)::int FROM ${officeInventoryConsumptions} WHERE ${officeInventoryConsumptions.itemId} = ${officeInventoryItems.id})`,
            })
            .from(officeInventoryItems)
            .where(eq(officeInventoryItems.id, id))
            .limit(1);

        if (!row) throw new NotFoundException(`Item #${id} not found`);
        if (row.purchaseCount > 0 || row.consumptionCount > 0) {
            throw new BadRequestException(
                "Cannot delete an item that has Purchase or Consumption logs. Delete those log entries first."
            );
        }

        await this.db.delete(officeInventoryItems).where(eq(officeInventoryItems.id, id));
        return { deleted: true, id };
    }

    private async getItemAvailableStock(
        itemId: number,
        excludeConsumptionId?: number
    ): Promise<number> {
        const consumptionSumSql = excludeConsumptionId
            ? sql<string>`(SELECT COALESCE(SUM(${officeInventoryConsumptions.qtyIssued}), 0) FROM ${officeInventoryConsumptions} WHERE ${officeInventoryConsumptions.itemId} = ${officeInventoryItems.id} AND ${officeInventoryConsumptions.id} <> ${excludeConsumptionId})`
            : sql<string>`(SELECT COALESCE(SUM(${officeInventoryConsumptions.qtyIssued}), 0) FROM ${officeInventoryConsumptions} WHERE ${officeInventoryConsumptions.itemId} = ${officeInventoryItems.id})`;

        const [row] = await this.db
            .select({
                openingStock: officeInventoryItems.openingStock,
                minStockLevel: officeInventoryItems.minStockLevel,
                totalPurchased: sql<string>`(SELECT COALESCE(SUM(${officeInventoryPurchases.qtyPurchased}), 0) FROM ${officeInventoryPurchases} WHERE ${officeInventoryPurchases.itemId} = ${officeInventoryItems.id})`,
                totalConsumed: consumptionSumSql,
            })
            .from(officeInventoryItems)
            .where(eq(officeInventoryItems.id, itemId))
            .limit(1);

        if (!row) throw new NotFoundException(`Item #${itemId} not found`);

        return computeItemStock(
            toNum(row.openingStock),
            toNum(row.totalPurchased),
            toNum(row.totalConsumed),
            toNum(row.minStockLevel)
        ).currentStock;
    }

    // =========================================================================
    // 2. PURCHASES LOG
    // =========================================================================

    async listPurchases() {
        const rows = await this.db
            .select({
                id: officeInventoryPurchases.id,
                purchaseDate: officeInventoryPurchases.purchaseDate,
                itemId: officeInventoryPurchases.itemId,
                itemCode: officeInventoryItems.itemCode,
                itemName: officeInventoryItems.itemName,
                category: officeInventoryItems.category,
                unit: officeInventoryItems.unit,
                qtyPurchased: officeInventoryPurchases.qtyPurchased,
                rate: officeInventoryPurchases.rate,
                amount: officeInventoryPurchases.amount,
                supplier: officeInventoryPurchases.supplier,
                notes: officeInventoryPurchases.notes,
                createdAt: officeInventoryPurchases.createdAt,
            })
            .from(officeInventoryPurchases)
            .innerJoin(
                officeInventoryItems,
                eq(officeInventoryPurchases.itemId, officeInventoryItems.id)
            )
            .orderBy(desc(officeInventoryPurchases.purchaseDate), desc(officeInventoryPurchases.id));

        return rows.map(r => ({
            ...r,
            qtyPurchased: toNum(r.qtyPurchased),
            rate: toNum(r.rate),
            amount: toNum(r.amount),
        }));
    }

    async createPurchase(userId: number, dto: CreatePurchaseDto) {
        const [item] = await this.db
            .select({ id: officeInventoryItems.id })
            .from(officeInventoryItems)
            .where(eq(officeInventoryItems.id, dto.itemId))
            .limit(1);
        if (!item) throw new NotFoundException(`Item #${dto.itemId} not found`);

        const amount = round2(dto.qtyPurchased * dto.rate);
        const [created] = await this.db
            .insert(officeInventoryPurchases)
            .values({
                purchaseDate: dto.purchaseDate,
                itemId: dto.itemId,
                qtyPurchased: String(dto.qtyPurchased),
                rate: String(dto.rate),
                amount: String(amount),
                supplier: dto.supplier ?? null,
                notes: dto.notes ?? null,
                createdBy: userId,
            })
            .returning();

        return created;
    }

    async updatePurchase(id: number, dto: UpdatePurchaseDto) {
        const [existing] = await this.db
            .select()
            .from(officeInventoryPurchases)
            .where(eq(officeInventoryPurchases.id, id))
            .limit(1);
        if (!existing) throw new NotFoundException(`Purchase #${id} not found`);

        const nextQty =
            dto.qtyPurchased !== undefined ? dto.qtyPurchased : toNum(existing.qtyPurchased);
        const nextRate = dto.rate !== undefined ? dto.rate : toNum(existing.rate);
        const nextAmount = round2(nextQty * nextRate);

        const [updated] = await this.db
            .update(officeInventoryPurchases)
            .set({
                ...(dto.purchaseDate !== undefined ? { purchaseDate: dto.purchaseDate } : {}),
                ...(dto.itemId !== undefined ? { itemId: dto.itemId } : {}),
                qtyPurchased: String(nextQty),
                rate: String(nextRate),
                amount: String(nextAmount),
                ...(dto.supplier !== undefined ? { supplier: dto.supplier } : {}),
                ...(dto.notes !== undefined ? { notes: dto.notes } : {}),
                updatedAt: new Date(),
            })
            .where(eq(officeInventoryPurchases.id, id))
            .returning();

        return updated;
    }

    async deletePurchase(id: number) {
        const [deleted] = await this.db
            .delete(officeInventoryPurchases)
            .where(eq(officeInventoryPurchases.id, id))
            .returning({ id: officeInventoryPurchases.id });
        if (!deleted) throw new NotFoundException(`Purchase #${id} not found`);
        return { deleted: true, id };
    }

    // =========================================================================
    // 3. CONSUMPTION LOG
    // =========================================================================

    async listConsumptions() {
        const rows = await this.db
            .select({
                id: officeInventoryConsumptions.id,
                consumptionDate: officeInventoryConsumptions.consumptionDate,
                itemId: officeInventoryConsumptions.itemId,
                itemCode: officeInventoryItems.itemCode,
                itemName: officeInventoryItems.itemName,
                category: officeInventoryItems.category,
                unit: officeInventoryItems.unit,
                qtyIssued: officeInventoryConsumptions.qtyIssued,
                issuedTo: officeInventoryConsumptions.issuedTo,
                notes: officeInventoryConsumptions.notes,
                createdAt: officeInventoryConsumptions.createdAt,
            })
            .from(officeInventoryConsumptions)
            .innerJoin(
                officeInventoryItems,
                eq(officeInventoryConsumptions.itemId, officeInventoryItems.id)
            )
            .orderBy(
                desc(officeInventoryConsumptions.consumptionDate),
                desc(officeInventoryConsumptions.id)
            );

        return rows.map(r => ({
            ...r,
            qtyIssued: toNum(r.qtyIssued),
        }));
    }

    async createConsumption(userId: number, dto: CreateConsumptionDto) {
        const available = await this.getItemAvailableStock(dto.itemId);
        if (dto.qtyIssued > available) {
            throw new BadRequestException(
                `Insufficient stock: requested ${dto.qtyIssued}, available ${available}`
            );
        }

        const [created] = await this.db
            .insert(officeInventoryConsumptions)
            .values({
                consumptionDate: dto.consumptionDate,
                itemId: dto.itemId,
                qtyIssued: String(dto.qtyIssued),
                issuedTo: dto.issuedTo ?? null,
                notes: dto.notes ?? null,
                createdBy: userId,
            })
            .returning();

        return created;
    }

    async updateConsumption(id: number, dto: UpdateConsumptionDto) {
        const [existing] = await this.db
            .select()
            .from(officeInventoryConsumptions)
            .where(eq(officeInventoryConsumptions.id, id))
            .limit(1);
        if (!existing) throw new NotFoundException(`Consumption #${id} not found`);

        const targetItemId = dto.itemId ?? existing.itemId;
        const targetQty = dto.qtyIssued !== undefined ? dto.qtyIssued : toNum(existing.qtyIssued);
        const available = await this.getItemAvailableStock(targetItemId, id);
        if (targetQty > available) {
            throw new BadRequestException(
                `Insufficient stock: requested ${targetQty}, available ${available}`
            );
        }

        const [updated] = await this.db
            .update(officeInventoryConsumptions)
            .set({
                ...(dto.consumptionDate !== undefined
                    ? { consumptionDate: dto.consumptionDate }
                    : {}),
                ...(dto.itemId !== undefined ? { itemId: dto.itemId } : {}),
                ...(dto.qtyIssued !== undefined ? { qtyIssued: String(dto.qtyIssued) } : {}),
                ...(dto.issuedTo !== undefined ? { issuedTo: dto.issuedTo } : {}),
                ...(dto.notes !== undefined ? { notes: dto.notes } : {}),
                updatedAt: new Date(),
            })
            .where(eq(officeInventoryConsumptions.id, id))
            .returning();

        return updated;
    }

    async deleteConsumption(id: number) {
        const [deleted] = await this.db
            .delete(officeInventoryConsumptions)
            .where(eq(officeInventoryConsumptions.id, id))
            .returning({ id: officeInventoryConsumptions.id });
        if (!deleted) throw new NotFoundException(`Consumption #${id} not found`);
        return { deleted: true, id };
    }

    // =========================================================================
    // 4. EQUIPMENT REGISTER & MOVEMENT LOG
    // =========================================================================

    async getNextEquipmentCode(category: string): Promise<{ code: string }> {
        const prefix = EQUIPMENT_CATEGORY_PREFIX[category];
        if (!prefix) {
            throw new BadRequestException(`Unsupported equipment category: ${category}`);
        }
        const rows = await this.db
            .select({ equipmentCode: officeEquipment.equipmentCode })
            .from(officeEquipment);
        return { code: generateNextCode(prefix, rows.map(r => r.equipmentCode)) };
    }

    async listEquipment() {
        const logAgg = this.db
            .select({
                equipmentId: officeEquipmentLogs.equipmentId,
                addedQty:
                    sql<string>`COALESCE(SUM(CASE WHEN ${officeEquipmentLogs.movementType} = 'New Purchase' THEN ${officeEquipmentLogs.qty} ELSE 0 END), 0)`.as(
                        "added_qty"
                    ),
                discardedQty:
                    sql<string>`COALESCE(SUM(CASE WHEN ${officeEquipmentLogs.movementType} IN ('Discard - End of Life', 'Discard - Damaged/Lost') THEN ${officeEquipmentLogs.qty} ELSE 0 END), 0)`.as(
                        "discarded_qty"
                    ),
            })
            .from(officeEquipmentLogs)
            .groupBy(officeEquipmentLogs.equipmentId)
            .as("log_agg");

        const rows = await this.db
            .select({
                id: officeEquipment.id,
                category: officeEquipment.category,
                equipmentCode: officeEquipment.equipmentCode,
                itemName: officeEquipment.itemName,
                unit: officeEquipment.unit,
                location: officeEquipment.location,
                openingQty: officeEquipment.openingQty,
                unitCost: officeEquipment.unitCost,
                condition: officeEquipment.condition,
                remarks: officeEquipment.remarks,
                createdAt: officeEquipment.createdAt,
                updatedAt: officeEquipment.updatedAt,
                addedQty: sql<string>`COALESCE(${logAgg.addedQty}, 0)`,
                discardedQty: sql<string>`COALESCE(${logAgg.discardedQty}, 0)`,
            })
            .from(officeEquipment)
            .leftJoin(logAgg, eq(officeEquipment.id, logAgg.equipmentId))
            .orderBy(asc(officeEquipment.equipmentCode));

        return rows.map(eqRow => {
            const openingQty = toNum(eqRow.openingQty);
            const added = toNum(eqRow.addedQty);
            const discarded = toNum(eqRow.discardedQty);
            const currentQty = computeEquipmentQty(openingQty, added, discarded);
            return {
                id: eqRow.id,
                category: eqRow.category,
                equipmentCode: eqRow.equipmentCode,
                itemName: eqRow.itemName,
                unit: eqRow.unit,
                location: eqRow.location,
                openingQty,
                qtyAdded: round2(added),
                qtyDiscarded: round2(discarded),
                currentQty,
                unitCost: toNum(eqRow.unitCost),
                condition: eqRow.condition,
                remarks: eqRow.remarks,
                createdAt: eqRow.createdAt,
                updatedAt: eqRow.updatedAt,
            };
        });
    }

    async createEquipment(userId: number, dto: CreateEquipmentDto) {
        const code =
            dto.equipmentCode?.trim().toUpperCase() ||
            (await this.getNextEquipmentCode(dto.category)).code;

        const dup = await this.db
            .select({ id: officeEquipment.id })
            .from(officeEquipment)
            .where(eq(officeEquipment.equipmentCode, code))
            .limit(1);
        if (dup.length > 0) {
            throw new ConflictException(`Equipment code "${code}" already exists`);
        }

        const [created] = await this.db
            .insert(officeEquipment)
            .values({
                category: dto.category,
                equipmentCode: code,
                itemName: dto.itemName,
                unit: dto.unit,
                location: dto.location ?? null,
                openingQty: String(dto.openingQty),
                unitCost: String(dto.unitCost),
                condition: dto.condition,
                remarks: dto.remarks ?? null,
                createdBy: userId,
            })
            .returning();

        return created;
    }

    async updateEquipment(id: number, dto: UpdateEquipmentDto) {
        const [existing] = await this.db
            .select()
            .from(officeEquipment)
            .where(eq(officeEquipment.id, id))
            .limit(1);
        if (!existing) throw new NotFoundException(`Equipment #${id} not found`);

        const nextCode = dto.equipmentCode ? dto.equipmentCode.trim().toUpperCase() : undefined;
        if (nextCode && nextCode !== existing.equipmentCode) {
            const dup = await this.db
                .select({ id: officeEquipment.id })
                .from(officeEquipment)
                .where(eq(officeEquipment.equipmentCode, nextCode))
                .limit(1);
            if (dup.length > 0) {
                throw new ConflictException(`Equipment code "${nextCode}" already exists`);
            }
        }

        const [updated] = await this.db
            .update(officeEquipment)
            .set({
                ...(dto.category !== undefined ? { category: dto.category } : {}),
                ...(nextCode !== undefined ? { equipmentCode: nextCode } : {}),
                ...(dto.itemName !== undefined ? { itemName: dto.itemName } : {}),
                ...(dto.unit !== undefined ? { unit: dto.unit } : {}),
                ...(dto.location !== undefined ? { location: dto.location } : {}),
                ...(dto.openingQty !== undefined ? { openingQty: String(dto.openingQty) } : {}),
                ...(dto.unitCost !== undefined ? { unitCost: String(dto.unitCost) } : {}),
                ...(dto.condition !== undefined ? { condition: dto.condition } : {}),
                ...(dto.remarks !== undefined ? { remarks: dto.remarks } : {}),
                updatedAt: new Date(),
            })
            .where(eq(officeEquipment.id, id))
            .returning();

        return updated;
    }

    async deleteEquipment(id: number) {
        const [row] = await this.db
            .select({
                id: officeEquipment.id,
                logCount: sql<number>`(SELECT COUNT(*)::int FROM ${officeEquipmentLogs} WHERE ${officeEquipmentLogs.equipmentId} = ${officeEquipment.id})`,
            })
            .from(officeEquipment)
            .where(eq(officeEquipment.id, id))
            .limit(1);

        if (!row) throw new NotFoundException(`Equipment #${id} not found`);
        if (row.logCount > 0) {
            throw new BadRequestException(
                "Cannot delete equipment with movement logs. Delete those movement entries first."
            );
        }

        await this.db.delete(officeEquipment).where(eq(officeEquipment.id, id));
        return { deleted: true, id };
    }

    async listEquipmentLogs() {
        const rows = await this.db
            .select({
                id: officeEquipmentLogs.id,
                logDate: officeEquipmentLogs.logDate,
                equipmentId: officeEquipmentLogs.equipmentId,
                equipmentCode: officeEquipment.equipmentCode,
                itemName: officeEquipment.itemName,
                category: officeEquipment.category,
                movementType: officeEquipmentLogs.movementType,
                qty: officeEquipmentLogs.qty,
                cost: officeEquipmentLogs.cost,
                reasonNotes: officeEquipmentLogs.reasonNotes,
                approvedBy: officeEquipmentLogs.approvedBy,
                createdAt: officeEquipmentLogs.createdAt,
            })
            .from(officeEquipmentLogs)
            .innerJoin(officeEquipment, eq(officeEquipmentLogs.equipmentId, officeEquipment.id))
            .orderBy(desc(officeEquipmentLogs.logDate), desc(officeEquipmentLogs.id));

        return rows.map(r => ({
            ...r,
            qty: toNum(r.qty),
            cost: r.cost !== null ? toNum(r.cost) : null,
        }));
    }

    async createEquipmentLog(userId: number, dto: CreateEquipmentLogDto) {
        const [eqRow] = await this.db
            .select({ id: officeEquipment.id })
            .from(officeEquipment)
            .where(eq(officeEquipment.id, dto.equipmentId))
            .limit(1);
        if (!eqRow) throw new NotFoundException(`Equipment #${dto.equipmentId} not found`);

        const [created] = await this.db
            .insert(officeEquipmentLogs)
            .values({
                logDate: dto.logDate,
                equipmentId: dto.equipmentId,
                movementType: dto.movementType,
                qty: String(dto.qty),
                cost: dto.cost !== null && dto.cost !== undefined ? String(dto.cost) : null,
                reasonNotes: dto.reasonNotes ?? null,
                approvedBy: dto.approvedBy ?? null,
                createdBy: userId,
            })
            .returning();

        return created;
    }

    async updateEquipmentLog(id: number, dto: UpdateEquipmentLogDto) {
        const [existing] = await this.db
            .select()
            .from(officeEquipmentLogs)
            .where(eq(officeEquipmentLogs.id, id))
            .limit(1);
        if (!existing) throw new NotFoundException(`Equipment log #${id} not found`);

        const [updated] = await this.db
            .update(officeEquipmentLogs)
            .set({
                ...(dto.logDate !== undefined ? { logDate: dto.logDate } : {}),
                ...(dto.equipmentId !== undefined ? { equipmentId: dto.equipmentId } : {}),
                ...(dto.movementType !== undefined ? { movementType: dto.movementType } : {}),
                ...(dto.qty !== undefined ? { qty: String(dto.qty) } : {}),
                ...(dto.cost !== undefined
                    ? { cost: dto.cost !== null ? String(dto.cost) : null }
                    : {}),
                ...(dto.reasonNotes !== undefined ? { reasonNotes: dto.reasonNotes } : {}),
                ...(dto.approvedBy !== undefined ? { approvedBy: dto.approvedBy } : {}),
                updatedAt: new Date(),
            })
            .where(eq(officeEquipmentLogs.id, id))
            .returning();

        return updated;
    }

    async deleteEquipmentLog(id: number) {
        const [deleted] = await this.db
            .delete(officeEquipmentLogs)
            .where(eq(officeEquipmentLogs.id, id))
            .returning({ id: officeEquipmentLogs.id });
        if (!deleted) throw new NotFoundException(`Equipment log #${id} not found`);
        return { deleted: true, id };
    }

    // =========================================================================
    // 5. PANTRY APPLIANCES, SERVICE VISITS, CLEANING LOGS
    // =========================================================================

    async getNextApplianceCode(): Promise<{ code: string }> {
        const rows = await this.db
            .select({ applianceCode: officeAppliances.applianceCode })
            .from(officeAppliances);
        return { code: generateNextCode("AP", rows.map(r => r.applianceCode)) };
    }

    async listAppliances() {
        const serviceAgg = this.db
            .select({
                applianceId: officeApplianceServices.applianceId,
                visitCount: sql<number>`COUNT(*)::int`.as("visit_count"),
                totalExpense: sql<string>`COALESCE(SUM(${officeApplianceServices.expense}), 0)`.as(
                    "total_expense"
                ),
                lastServiceDate: sql<string | null>`MAX(${officeApplianceServices.serviceDate})`.as(
                    "last_service_date"
                ),
                nextServiceDue:
                    sql<string | null>`MAX(${officeApplianceServices.nextServiceDue})`.as(
                        "next_service_due"
                    ),
            })
            .from(officeApplianceServices)
            .groupBy(officeApplianceServices.applianceId)
            .as("service_agg");

        const cleaningAgg = this.db
            .select({
                applianceId: officeApplianceCleanings.applianceId,
                cleaningCount: sql<number>`COUNT(*)::int`.as("cleaning_count"),
                lastCleanedDate:
                    sql<string | null>`MAX(${officeApplianceCleanings.cleaningDate})`.as(
                        "last_cleaned_date"
                    ),
            })
            .from(officeApplianceCleanings)
            .groupBy(officeApplianceCleanings.applianceId)
            .as("cleaning_agg");

        const rows = await this.db
            .select({
                id: officeAppliances.id,
                applianceCode: officeAppliances.applianceCode,
                applianceName: officeAppliances.applianceName,
                brandModel: officeAppliances.brandModel,
                location: officeAppliances.location,
                purchaseDate: officeAppliances.purchaseDate,
                purchaseCost: officeAppliances.purchaseCost,
                warrantyExpiry: officeAppliances.warrantyExpiry,
                serviceFrequency: officeAppliances.serviceFrequency,
                cleaningFrequency: officeAppliances.cleaningFrequency,
                status: officeAppliances.status,
                discardDate: officeAppliances.discardDate,
                notes: officeAppliances.notes,
                createdAt: officeAppliances.createdAt,
                updatedAt: officeAppliances.updatedAt,
                visitCount: sql<number>`COALESCE(${serviceAgg.visitCount}, 0)`,
                totalExpense: sql<string>`COALESCE(${serviceAgg.totalExpense}, 0)`,
                lastServiceDate: serviceAgg.lastServiceDate,
                nextServiceDue: serviceAgg.nextServiceDue,
                cleaningCount: sql<number>`COALESCE(${cleaningAgg.cleaningCount}, 0)`,
                lastCleanedDate: cleaningAgg.lastCleanedDate,
            })
            .from(officeAppliances)
            .leftJoin(serviceAgg, eq(officeAppliances.id, serviceAgg.applianceId))
            .leftJoin(cleaningAgg, eq(officeAppliances.id, cleaningAgg.applianceId))
            .orderBy(asc(officeAppliances.applianceCode));

        const { today } = getCurrentWeekBounds();

        return rows.map(app => {
            const cleaningsCount = Number(app.cleaningCount) || 0;
            const lastCleanedDate = app.lastCleanedDate ?? null;
            const nextCleaningDue = computeNextCleaningDue({
                status: app.status,
                cleaningFrequency: app.cleaningFrequency,
                purchaseDate: app.purchaseDate,
                cleaningsCount,
                lastCleanedDate,
            });
            const isCleaningOverdue = Boolean(
                app.status === "In Service" && nextCleaningDue && nextCleaningDue < today
            );

            return {
                id: app.id,
                applianceCode: app.applianceCode,
                applianceName: app.applianceName,
                brandModel: app.brandModel,
                location: app.location,
                purchaseDate: app.purchaseDate,
                purchaseCost: app.purchaseCost !== null ? toNum(app.purchaseCost) : null,
                warrantyExpiry: app.warrantyExpiry,
                serviceFrequency: app.serviceFrequency,
                cleaningFrequency: app.cleaningFrequency,
                status: app.status,
                discardDate: app.discardDate,
                notes: app.notes,
                serviceVisitsCount: Number(app.visitCount) || 0,
                totalMaintenanceExpense: round2(toNum(app.totalExpense)),
                lastServiceDate: app.lastServiceDate ?? null,
                nextServiceDue: app.nextServiceDue ?? null,
                cleaningsCount,
                lastCleanedDate,
                nextCleaningDue,
                isCleaningOverdue,
                createdAt: app.createdAt,
                updatedAt: app.updatedAt,
            };
        });
    }

    async createAppliance(userId: number, dto: CreateApplianceDto) {
        const code =
            dto.applianceCode?.trim().toUpperCase() || (await this.getNextApplianceCode()).code;

        const dup = await this.db
            .select({ id: officeAppliances.id })
            .from(officeAppliances)
            .where(eq(officeAppliances.applianceCode, code))
            .limit(1);
        if (dup.length > 0) {
            throw new ConflictException(`Appliance code "${code}" already exists`);
        }

        const [created] = await this.db
            .insert(officeAppliances)
            .values({
                applianceCode: code,
                applianceName: dto.applianceName,
                brandModel: dto.brandModel ?? null,
                location: dto.location ?? null,
                purchaseDate: dto.purchaseDate ?? null,
                purchaseCost:
                    dto.purchaseCost !== null && dto.purchaseCost !== undefined
                        ? String(dto.purchaseCost)
                        : null,
                warrantyExpiry: dto.warrantyExpiry ?? null,
                serviceFrequency: dto.serviceFrequency,
                cleaningFrequency: dto.cleaningFrequency,
                status: dto.status,
                discardDate: dto.discardDate ?? null,
                notes: dto.notes ?? null,
                createdBy: userId,
            })
            .returning();

        return created;
    }

    async updateAppliance(id: number, dto: UpdateApplianceDto) {
        const [existing] = await this.db
            .select()
            .from(officeAppliances)
            .where(eq(officeAppliances.id, id))
            .limit(1);
        if (!existing) throw new NotFoundException(`Appliance #${id} not found`);

        const nextCode = dto.applianceCode ? dto.applianceCode.trim().toUpperCase() : undefined;
        if (nextCode && nextCode !== existing.applianceCode) {
            const dup = await this.db
                .select({ id: officeAppliances.id })
                .from(officeAppliances)
                .where(eq(officeAppliances.applianceCode, nextCode))
                .limit(1);
            if (dup.length > 0) {
                throw new ConflictException(`Appliance code "${nextCode}" already exists`);
            }
        }

        const [updated] = await this.db
            .update(officeAppliances)
            .set({
                ...(nextCode !== undefined ? { applianceCode: nextCode } : {}),
                ...(dto.applianceName !== undefined ? { applianceName: dto.applianceName } : {}),
                ...(dto.brandModel !== undefined ? { brandModel: dto.brandModel } : {}),
                ...(dto.location !== undefined ? { location: dto.location } : {}),
                ...(dto.purchaseDate !== undefined ? { purchaseDate: dto.purchaseDate } : {}),
                ...(dto.purchaseCost !== undefined
                    ? { purchaseCost: dto.purchaseCost !== null ? String(dto.purchaseCost) : null }
                    : {}),
                ...(dto.warrantyExpiry !== undefined ? { warrantyExpiry: dto.warrantyExpiry } : {}),
                ...(dto.serviceFrequency !== undefined
                    ? { serviceFrequency: dto.serviceFrequency }
                    : {}),
                ...(dto.cleaningFrequency !== undefined
                    ? { cleaningFrequency: dto.cleaningFrequency }
                    : {}),
                ...(dto.status !== undefined ? { status: dto.status } : {}),
                ...(dto.discardDate !== undefined ? { discardDate: dto.discardDate } : {}),
                ...(dto.notes !== undefined ? { notes: dto.notes } : {}),
                updatedAt: new Date(),
            })
            .where(eq(officeAppliances.id, id))
            .returning();

        return updated;
    }

    async deleteAppliance(id: number) {
        const [row] = await this.db
            .select({
                id: officeAppliances.id,
                serviceCount: sql<number>`(SELECT COUNT(*)::int FROM ${officeApplianceServices} WHERE ${officeApplianceServices.applianceId} = ${officeAppliances.id})`,
                cleaningCount: sql<number>`(SELECT COUNT(*)::int FROM ${officeApplianceCleanings} WHERE ${officeApplianceCleanings.applianceId} = ${officeAppliances.id})`,
            })
            .from(officeAppliances)
            .where(eq(officeAppliances.id, id))
            .limit(1);

        if (!row) throw new NotFoundException(`Appliance #${id} not found`);
        if (row.serviceCount > 0 || row.cleaningCount > 0) {
            throw new BadRequestException(
                "Cannot delete an appliance that has Service or Cleaning logs. Delete those logs first."
            );
        }

        await this.db.delete(officeAppliances).where(eq(officeAppliances.id, id));
        return { deleted: true, id };
    }

    async listApplianceServices() {
        const rows = await this.db
            .select({
                id: officeApplianceServices.id,
                serviceDate: officeApplianceServices.serviceDate,
                applianceId: officeApplianceServices.applianceId,
                applianceCode: officeAppliances.applianceCode,
                applianceName: officeAppliances.applianceName,
                visitType: officeApplianceServices.visitType,
                vendorTechnician: officeApplianceServices.vendorTechnician,
                expense: officeApplianceServices.expense,
                nextServiceDue: officeApplianceServices.nextServiceDue,
                notes: officeApplianceServices.notes,
                createdAt: officeApplianceServices.createdAt,
            })
            .from(officeApplianceServices)
            .innerJoin(officeAppliances, eq(officeApplianceServices.applianceId, officeAppliances.id))
            .orderBy(desc(officeApplianceServices.serviceDate), desc(officeApplianceServices.id));

        return rows.map(r => ({
            ...r,
            expense: toNum(r.expense),
        }));
    }

    async createApplianceService(userId: number, dto: CreateApplianceServiceDto) {
        const [app] = await this.db
            .select({ id: officeAppliances.id })
            .from(officeAppliances)
            .where(eq(officeAppliances.id, dto.applianceId))
            .limit(1);
        if (!app) throw new NotFoundException(`Appliance #${dto.applianceId} not found`);

        const [created] = await this.db
            .insert(officeApplianceServices)
            .values({
                serviceDate: dto.serviceDate,
                applianceId: dto.applianceId,
                visitType: dto.visitType,
                vendorTechnician: dto.vendorTechnician ?? null,
                expense: String(dto.expense),
                nextServiceDue: dto.nextServiceDue ?? null,
                notes: dto.notes ?? null,
                createdBy: userId,
            })
            .returning();

        return created;
    }

    async updateApplianceService(id: number, dto: UpdateApplianceServiceDto) {
        const [existing] = await this.db
            .select()
            .from(officeApplianceServices)
            .where(eq(officeApplianceServices.id, id))
            .limit(1);
        if (!existing) throw new NotFoundException(`Service visit #${id} not found`);

        const [updated] = await this.db
            .update(officeApplianceServices)
            .set({
                ...(dto.serviceDate !== undefined ? { serviceDate: dto.serviceDate } : {}),
                ...(dto.applianceId !== undefined ? { applianceId: dto.applianceId } : {}),
                ...(dto.visitType !== undefined ? { visitType: dto.visitType } : {}),
                ...(dto.vendorTechnician !== undefined
                    ? { vendorTechnician: dto.vendorTechnician }
                    : {}),
                ...(dto.expense !== undefined ? { expense: String(dto.expense) } : {}),
                ...(dto.nextServiceDue !== undefined
                    ? { nextServiceDue: dto.nextServiceDue }
                    : {}),
                ...(dto.notes !== undefined ? { notes: dto.notes } : {}),
                updatedAt: new Date(),
            })
            .where(eq(officeApplianceServices.id, id))
            .returning();

        return updated;
    }

    async deleteApplianceService(id: number) {
        const [deleted] = await this.db
            .delete(officeApplianceServices)
            .where(eq(officeApplianceServices.id, id))
            .returning({ id: officeApplianceServices.id });
        if (!deleted) throw new NotFoundException(`Service visit #${id} not found`);
        return { deleted: true, id };
    }

    async listApplianceCleanings() {
        const rows = await this.db
            .select({
                id: officeApplianceCleanings.id,
                cleaningDate: officeApplianceCleanings.cleaningDate,
                applianceId: officeApplianceCleanings.applianceId,
                applianceCode: officeAppliances.applianceCode,
                applianceName: officeAppliances.applianceName,
                cleaningType: officeApplianceCleanings.cleaningType,
                doneBy: officeApplianceCleanings.doneBy,
                cost: officeApplianceCleanings.cost,
                notes: officeApplianceCleanings.notes,
                createdAt: officeApplianceCleanings.createdAt,
            })
            .from(officeApplianceCleanings)
            .innerJoin(
                officeAppliances,
                eq(officeApplianceCleanings.applianceId, officeAppliances.id)
            )
            .orderBy(desc(officeApplianceCleanings.cleaningDate), desc(officeApplianceCleanings.id));

        return rows.map(r => ({
            ...r,
            cost: toNum(r.cost),
        }));
    }

    async createApplianceCleaning(userId: number, dto: CreateApplianceCleaningDto) {
        const [app] = await this.db
            .select({ id: officeAppliances.id })
            .from(officeAppliances)
            .where(eq(officeAppliances.id, dto.applianceId))
            .limit(1);
        if (!app) throw new NotFoundException(`Appliance #${dto.applianceId} not found`);

        const [created] = await this.db
            .insert(officeApplianceCleanings)
            .values({
                cleaningDate: dto.cleaningDate,
                applianceId: dto.applianceId,
                cleaningType: dto.cleaningType,
                doneBy: dto.doneBy ?? null,
                cost: String(dto.cost ?? 0),
                notes: dto.notes ?? null,
                createdBy: userId,
            })
            .returning();

        return created;
    }

    async updateApplianceCleaning(id: number, dto: UpdateApplianceCleaningDto) {
        const [existing] = await this.db
            .select()
            .from(officeApplianceCleanings)
            .where(eq(officeApplianceCleanings.id, id))
            .limit(1);
        if (!existing) throw new NotFoundException(`Cleaning log #${id} not found`);

        const [updated] = await this.db
            .update(officeApplianceCleanings)
            .set({
                ...(dto.cleaningDate !== undefined ? { cleaningDate: dto.cleaningDate } : {}),
                ...(dto.applianceId !== undefined ? { applianceId: dto.applianceId } : {}),
                ...(dto.cleaningType !== undefined ? { cleaningType: dto.cleaningType } : {}),
                ...(dto.doneBy !== undefined ? { doneBy: dto.doneBy } : {}),
                ...(dto.cost !== undefined ? { cost: String(dto.cost ?? 0) } : {}),
                ...(dto.notes !== undefined ? { notes: dto.notes } : {}),
                updatedAt: new Date(),
            })
            .where(eq(officeApplianceCleanings.id, id))
            .returning();

        return updated;
    }

    async deleteApplianceCleaning(id: number) {
        const [deleted] = await this.db
            .delete(officeApplianceCleanings)
            .where(eq(officeApplianceCleanings.id, id))
            .returning({ id: officeApplianceCleanings.id });
        if (!deleted) throw new NotFoundException(`Cleaning log #${id} not found`);
        return { deleted: true, id };
    }

    // =========================================================================
    // 6. REPORTS & WEEKLY TASKS DASHBOARD (Single-query SQL aggregations)
    // =========================================================================

    private async buildPeriodReport(startDate: string, endDate: string, category?: string) {
        const purchaseAgg = this.db
            .select({
                itemId: officeInventoryPurchases.itemId,
                allTimeQty: sql<string>`COALESCE(SUM(${officeInventoryPurchases.qtyPurchased}), 0)`.as(
                    "all_purchased_qty"
                ),
                periodQty:
                    sql<string>`COALESCE(SUM(${officeInventoryPurchases.qtyPurchased}) FILTER (WHERE ${officeInventoryPurchases.purchaseDate} >= ${startDate} AND ${officeInventoryPurchases.purchaseDate} <= ${endDate}), 0)`.as(
                        "period_purchased_qty"
                    ),
                periodAmount:
                    sql<string>`COALESCE(SUM(${officeInventoryPurchases.amount}) FILTER (WHERE ${officeInventoryPurchases.purchaseDate} >= ${startDate} AND ${officeInventoryPurchases.purchaseDate} <= ${endDate}), 0)`.as(
                        "period_purchased_amount"
                    ),
            })
            .from(officeInventoryPurchases)
            .groupBy(officeInventoryPurchases.itemId)
            .as("purchase_agg");

        const consumptionAgg = this.db
            .select({
                itemId: officeInventoryConsumptions.itemId,
                allTimeQty: sql<string>`COALESCE(SUM(${officeInventoryConsumptions.qtyIssued}), 0)`.as(
                    "all_consumed_qty"
                ),
                periodQty:
                    sql<string>`COALESCE(SUM(${officeInventoryConsumptions.qtyIssued}) FILTER (WHERE ${officeInventoryConsumptions.consumptionDate} >= ${startDate} AND ${officeInventoryConsumptions.consumptionDate} <= ${endDate}), 0)`.as(
                        "period_consumed_qty"
                    ),
            })
            .from(officeInventoryConsumptions)
            .groupBy(officeInventoryConsumptions.itemId)
            .as("consumption_agg");

        const baseQuery = this.db
            .select({
                id: officeInventoryItems.id,
                itemCode: officeInventoryItems.itemCode,
                itemName: officeInventoryItems.itemName,
                category: officeInventoryItems.category,
                unit: officeInventoryItems.unit,
                openingStock: officeInventoryItems.openingStock,
                minStockLevel: officeInventoryItems.minStockLevel,
                allPurchased: sql<string>`COALESCE(${purchaseAgg.allTimeQty}, 0)`,
                allConsumed: sql<string>`COALESCE(${consumptionAgg.allTimeQty}, 0)`,
                periodPurchased: sql<string>`COALESCE(${purchaseAgg.periodQty}, 0)`,
                periodAmount: sql<string>`COALESCE(${purchaseAgg.periodAmount}, 0)`,
                periodConsumed: sql<string>`COALESCE(${consumptionAgg.periodQty}, 0)`,
            })
            .from(officeInventoryItems)
            .leftJoin(purchaseAgg, eq(officeInventoryItems.id, purchaseAgg.itemId))
            .leftJoin(consumptionAgg, eq(officeInventoryItems.id, consumptionAgg.itemId));

        const rawRows =
            category && category !== "All"
                ? await baseQuery
                      .where(eq(officeInventoryItems.category, category))
                      .orderBy(asc(officeInventoryItems.itemCode))
                : await baseQuery.orderBy(asc(officeInventoryItems.itemCode));

        const rows = rawRows.map(r => {
            const minStockLevel = toNum(r.minStockLevel);
            const { currentStock, status } = computeItemStock(
                toNum(r.openingStock),
                toNum(r.allPurchased),
                toNum(r.allConsumed),
                minStockLevel
            );
            return {
                id: r.id,
                itemCode: r.itemCode,
                itemName: r.itemName,
                category: r.category,
                unit: r.unit,
                qtyPurchased: round2(toNum(r.periodPurchased)),
                purchaseAmount: round2(toNum(r.periodAmount)),
                qtyConsumed: round2(toNum(r.periodConsumed)),
                currentStock,
                minStockLevel,
                status,
            };
        });

        const totals = rows.reduce(
            (acc, r) => ({
                qtyPurchased: round2(acc.qtyPurchased + r.qtyPurchased),
                purchaseAmount: round2(acc.purchaseAmount + r.purchaseAmount),
                qtyConsumed: round2(acc.qtyConsumed + r.qtyConsumed),
            }),
            { qtyPurchased: 0, purchaseAmount: 0, qtyConsumed: 0 }
        );

        return {
            startDate,
            endDate,
            category: category || "All",
            rows,
            totals,
        };
    }

    async getWeeklyReport(startDate?: string, category?: string) {
        const { weekStart } = getCurrentWeekBounds();
        const start = startDate?.trim().slice(0, 10) || weekStart;
        const end = addDaysIso(start, 6);
        return this.buildPeriodReport(start, end, category);
    }

    async getMonthlyReport(startDate?: string, category?: string) {
        const { today } = getCurrentWeekBounds();
        const raw = startDate?.trim().slice(0, 10) || `${today.slice(0, 7)}-01`;
        const start = `${raw.slice(0, 7)}-01`;
        const end = monthEndIso(start);
        return this.buildPeriodReport(start, end, category);
    }

    async getWeeklyTasksDashboard() {
        const { weekStart, weekEnd, today } = getCurrentWeekBounds();

        const [
            items,
            appliances,
            [purchaseWeek],
            [consumptionWeek],
            [cleaningWeek],
            [serviceWeek],
            [eqWeek],
        ] = await Promise.all([
            this.listItems(),
            this.listAppliances(),
            this.db
                .select({
                    count: sql<number>`COUNT(*)::int`,
                    value: sql<string>`COALESCE(SUM(${officeInventoryPurchases.amount}), 0)`,
                })
                .from(officeInventoryPurchases)
                .where(
                    and(
                        gte(officeInventoryPurchases.purchaseDate, weekStart),
                        lte(officeInventoryPurchases.purchaseDate, weekEnd)
                    )
                ),
            this.db
                .select({ count: sql<number>`COUNT(*)::int` })
                .from(officeInventoryConsumptions)
                .where(
                    and(
                        gte(officeInventoryConsumptions.consumptionDate, weekStart),
                        lte(officeInventoryConsumptions.consumptionDate, weekEnd)
                    )
                ),
            this.db
                .select({ count: sql<number>`COUNT(*)::int` })
                .from(officeApplianceCleanings)
                .where(
                    and(
                        gte(officeApplianceCleanings.cleaningDate, weekStart),
                        lte(officeApplianceCleanings.cleaningDate, weekEnd)
                    )
                ),
            this.db
                .select({
                    count: sql<number>`COUNT(*)::int`,
                    expense: sql<string>`COALESCE(SUM(${officeApplianceServices.expense}), 0)`,
                })
                .from(officeApplianceServices)
                .where(
                    and(
                        gte(officeApplianceServices.serviceDate, weekStart),
                        lte(officeApplianceServices.serviceDate, weekEnd)
                    )
                ),
            this.db
                .select({
                    purchasesCount: sql<number>`COUNT(*) FILTER (WHERE ${officeEquipmentLogs.movementType} = 'New Purchase')::int`,
                    discardsCount: sql<number>`COUNT(*) FILTER (WHERE ${officeEquipmentLogs.movementType} IN ('Discard - End of Life', 'Discard - Damaged/Lost'))::int`,
                })
                .from(officeEquipmentLogs)
                .where(
                    and(
                        gte(officeEquipmentLogs.logDate, weekStart),
                        lte(officeEquipmentLogs.logDate, weekEnd)
                    )
                ),
        ]);

        const lowStockItems = items
            .filter(i => i.status === "LOW STOCK")
            .map(i => ({
                id: i.id,
                itemCode: i.itemCode,
                itemName: i.itemName,
                category: i.category,
                unit: i.unit,
                currentStock: i.currentStock,
                minStockLevel: i.minStockLevel,
            }));

        const cleaningsDue = appliances
            .filter(
                a =>
                    a.status === "In Service" &&
                    a.nextCleaningDue !== null &&
                    a.nextCleaningDue <= weekEnd
            )
            .map(a => ({
                id: a.id,
                applianceCode: a.applianceCode,
                applianceName: a.applianceName,
                cleaningFrequency: a.cleaningFrequency,
                lastCleanedDate: a.lastCleanedDate,
                dueDate: a.nextCleaningDue!,
                isOverdue: a.nextCleaningDue! < today,
            }));

        const servicesDue = appliances
            .filter(
                a =>
                    a.status === "In Service" &&
                    a.nextServiceDue !== null &&
                    a.nextServiceDue <= weekEnd
            )
            .map(a => ({
                id: a.id,
                applianceCode: a.applianceCode,
                applianceName: a.applianceName,
                serviceFrequency: a.serviceFrequency,
                nextServiceDue: a.nextServiceDue!,
                isOverdue: a.nextServiceDue! < today,
            }));

        return {
            weekStart,
            weekEnd,
            today,
            dueThisWeek: {
                lowStockCount: lowStockItems.length,
                cleaningsDueCount: cleaningsDue.length,
                servicesDueCount: servicesDue.length,
                lowStockItems,
                cleaningsDue,
                servicesDue,
            },
            completedThisWeek: {
                purchasesCount: purchaseWeek?.count ?? 0,
                purchasesValue: round2(toNum(purchaseWeek?.value)),
                consumptionsCount: consumptionWeek?.count ?? 0,
                cleaningsCount: cleaningWeek?.count ?? 0,
                servicesCount: serviceWeek?.count ?? 0,
                servicesExpense: round2(toNum(serviceWeek?.expense)),
                equipmentPurchasesCount: eqWeek?.purchasesCount ?? 0,
                equipmentDiscardsCount: eqWeek?.discardsCount ?? 0,
            },
        };
    }
}
