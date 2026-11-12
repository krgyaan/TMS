import { BadRequestException, ConflictException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { and, desc, eq, ilike, isNull, or, sql, type SQL } from "drizzle-orm";
import { DRIZZLE } from "@db/database.module";
import type { DbInstance } from "@db";
import { inventoryItems, type InventoryItem, type NewInventoryItem } from "@db/schemas/accounts/inventory-items.schema";
import { resolveConversion } from "./conversion-rules";

type ListOptions = { search?: string; page?: number; limit?: number };
type ItemInput = Pick<NewInventoryItem, "itemName" | "itemType" | "description" | "specifications" | "unit" | "hsnCode" | "isActive">
    & { conversionUnit?: string | null; conversionFactor?: string | number | null };

@Injectable()
export class InventoryItemsService {
    constructor(@Inject(DRIZZLE) private readonly db: DbInstance) {}

    async findAll(options: ListOptions) {
        const page = Math.max(1, options.page || 1);
        const limit = Math.min(100, Math.max(1, options.limit || 25));
        const search = options.search?.trim();
        const filters: SQL[] = [
            isNull(inventoryItems.deletedAt),
            search ? or(ilike(inventoryItems.itemCode, `%${search}%`), ilike(inventoryItems.itemName, `%${search}%`), ilike(inventoryItems.itemType, `%${search}%`), ilike(inventoryItems.hsnCode, `%${search}%`)) : undefined,
        ].filter((filter): filter is SQL => Boolean(filter));
        const where = filters.length ? and(...filters) : undefined;
        const [data, count] = await Promise.all([
            this.db.select().from(inventoryItems).where(where).orderBy(desc(inventoryItems.createdAt)).limit(limit).offset((page - 1) * limit),
            this.db.select({ count: sql<number>`count(*)` }).from(inventoryItems).where(where),
        ]);
        const total = Number(count[0]?.count || 0);
        return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
    }

    async findById(id: number): Promise<InventoryItem> {
        const [item] = await this.db.select().from(inventoryItems).where(and(eq(inventoryItems.id, id), isNull(inventoryItems.deletedAt))).limit(1);
        if (!item) throw new NotFoundException(`Inventory item with ID ${id} not found`);
        return item;
    }

    async create(data: ItemInput): Promise<InventoryItem> {
        await this.ensureUnique(data);
        const conversion = this.resolveItemConversion(data.unit, data.conversionUnit, data.conversionFactor, data.specifications || {});
        const [item] = await this.db.insert(inventoryItems).values({
            ...data, ...conversion, itemCode: await this.nextItemCode(),
        }).returning();
        return item;
    }

    async update(id: number, data: Partial<ItemInput>): Promise<InventoryItem> {
        const current = await this.findById(id);
        const updatedValues = { ...current, ...data };
        await this.ensureUnique(updatedValues, id);
        const conversion = this.resolveItemConversion(
            updatedValues.unit,
            updatedValues.conversionUnit,
            updatedValues.conversionFactor,
            updatedValues.specifications || {},
        );
        const values = {
            itemName: updatedValues.itemName, itemType: updatedValues.itemType, description: updatedValues.description,
            specifications: updatedValues.specifications, unit: updatedValues.unit, hsnCode: updatedValues.hsnCode,
            isActive: updatedValues.isActive, ...conversion, itemGroup: current.itemGroup, updatedAt: new Date(),
        };
        const [item] = await this.db.update(inventoryItems).set(values).where(eq(inventoryItems.id, id)).returning();
        return item;
    }

    async softDelete(id: number): Promise<void> {
        await this.findById(id);
        await this.db.update(inventoryItems).set({ isActive: false, deletedAt: new Date(), updatedAt: new Date() }).where(eq(inventoryItems.id, id));
    }

    private resolveItemConversion(unit: string, conversionUnit: string | null | undefined, factor: unknown, specifications: Record<string, string>) {
        try {
            return resolveConversion(unit, conversionUnit, factor, specifications);
        } catch (error) {
            throw new BadRequestException(error instanceof Error ? error.message : "Invalid item conversion");
        }
    }

    private async nextItemCode() {
        const { rows } = await this.db.execute<{ nextval: string }>(sql`SELECT nextval('inventory_item_code_seq') AS nextval`);
        const nextValue = rows[0]?.nextval;
        if (!nextValue) throw new Error("Unable to generate an inventory item code");
        return `ITM-${String(nextValue).padStart(4, "0")}`;
    }

    private async ensureUnique(data: Pick<ItemInput, "itemName" | "itemType" | "specifications" | "unit">, excludeId?: number) {
        const candidates = await this.db.select().from(inventoryItems).where(
            and(
                isNull(inventoryItems.deletedAt),
                eq(inventoryItems.itemName, data.itemName),
                eq(inventoryItems.unit, data.unit),
                data.itemType ? eq(inventoryItems.itemType, data.itemType) : sql`${inventoryItems.itemType} is null`,
            ),
        );
        const sameSpecifications = (left: Record<string, string> = {}, right: Record<string, string> = {}) => {
            const keys = Object.keys(left).sort();
            return keys.length === Object.keys(right).length && keys.every(key => left[key] === right[key]);
        };
        const duplicate = candidates.find(candidate => candidate.id !== excludeId && candidate.unit === data.unit && sameSpecifications(candidate.specifications || {}, data.specifications || {}));
        if (duplicate) throw new ConflictException("An item with the same name, type, specifications and unit already exists");
    }

}
