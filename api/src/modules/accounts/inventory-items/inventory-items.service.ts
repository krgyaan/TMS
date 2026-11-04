import { BadRequestException, ConflictException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { and, desc, eq, ilike, isNull, or, sql, type SQL } from "drizzle-orm";
import { DRIZZLE } from "@db/database.module";
import type { DbInstance } from "@db";
import { inventoryItems, type InventoryItem, type NewInventoryItem } from "@db/schemas/accounts/inventory-items.schema";
import { conversionLabel, getConversionRule, type Unit } from "./conversion-rules";

type ListOptions = { teamId: number; search?: string; page?: number; limit?: number; itemName?: string; unit?: string; isActive?: boolean };
type ItemInput = Omit<NewInventoryItem, "id" | "itemCode" | "teamId" | "createdAt" | "updatedAt" | "deletedAt">;

@Injectable()
export class InventoryItemsService {
    constructor(@Inject(DRIZZLE) private readonly db: DbInstance) {}

    async findAll(options: ListOptions) {
        const page = Math.max(1, options.page || 1);
        const limit = Math.min(100, Math.max(1, options.limit || 25));
        const search = options.search?.trim();
        const filters: SQL[] = [
            eq(inventoryItems.teamId, options.teamId),
            isNull(inventoryItems.deletedAt),
            search ? or(ilike(inventoryItems.itemCode, `%${search}%`), ilike(inventoryItems.itemName, `%${search}%`), ilike(inventoryItems.itemType, `%${search}%`), ilike(inventoryItems.hsnCode, `%${search}%`)) : undefined,
            options.itemName ? eq(inventoryItems.itemName, options.itemName) : undefined,
            options.unit ? eq(inventoryItems.unit, options.unit) : undefined,
            options.isActive === undefined ? undefined : eq(inventoryItems.isActive, options.isActive),
        ].filter((filter): filter is SQL => Boolean(filter));
        const where = filters.length ? and(...filters) : undefined;
        const [data, count] = await Promise.all([
            this.db.select().from(inventoryItems).where(where).orderBy(desc(inventoryItems.createdAt)).limit(limit).offset((page - 1) * limit),
            this.db.select({ count: sql<number>`count(*)` }).from(inventoryItems).where(where),
        ]);
        const total = Number(count[0]?.count || 0);
        return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
    }

    async findById(id: number, teamId: number): Promise<InventoryItem> {
        const [item] = await this.db.select().from(inventoryItems).where(and(eq(inventoryItems.id, id), eq(inventoryItems.teamId, teamId), isNull(inventoryItems.deletedAt))).limit(1);
        if (!item) throw new NotFoundException(`Inventory item with ID ${id} not found`);
        return item;
    }

    async create(data: ItemInput, teamId: number): Promise<InventoryItem> {
        const normalized = this.normalizeConversion(data);
        await this.ensureUnique(normalized, teamId, undefined);
        const [item] = await this.db.insert(inventoryItems).values({ ...normalized, teamId, itemCode: await this.nextItemCode() }).returning();
        return item;
    }

    async update(id: number, data: Partial<ItemInput>, teamId: number): Promise<InventoryItem> {
        const current = await this.findById(id, teamId);
        const normalized = this.normalizeConversion({ ...current, ...data });
        await this.ensureUnique(normalized, teamId, id);
        const [item] = await this.db.update(inventoryItems).set({ ...normalized, updatedAt: new Date() }).where(and(eq(inventoryItems.id, id), eq(inventoryItems.teamId, teamId))).returning();
        return item;
    }

    async softDelete(id: number, teamId: number): Promise<void> {
        await this.findById(id, teamId);
        await this.db.update(inventoryItems).set({ isActive: false, deletedAt: new Date(), updatedAt: new Date() }).where(and(eq(inventoryItems.id, id), eq(inventoryItems.teamId, teamId)));
    }

    private async nextItemCode() {
        const { rows } = await this.db.execute<{ nextval: string }>(sql`SELECT nextval('inventory_item_code_seq') AS nextval`);
        const nextValue = rows[0]?.nextval;
        if (!nextValue) throw new Error("Unable to generate an inventory item code");
        return `ITM-${String(nextValue).padStart(4, "0")}`;
    }

    private async ensureUnique(data: Pick<ItemInput, "itemName" | "itemType" | "specifications">, teamId: number, excludeId?: number) {
        const candidates = await this.db.select({ id: inventoryItems.id }).from(inventoryItems).where(
            and(
                isNull(inventoryItems.deletedAt),
                eq(inventoryItems.teamId, teamId),
                eq(inventoryItems.itemName, data.itemName),
                data.itemType ? eq(inventoryItems.itemType, data.itemType) : sql`${inventoryItems.itemType} is null`,
            ),
        );
        const duplicate = candidates.find(candidate => candidate.id !== excludeId);
        if (duplicate) {
            const [existing] = await this.db.select().from(inventoryItems).where(eq(inventoryItems.id, duplicate.id));
            if (JSON.stringify(existing?.specifications || {}) === JSON.stringify(data.specifications || {})) {
                throw new ConflictException("An item with the same name, type and specifications already exists");
            }
        }
    }

    private normalizeConversion(data: ItemInput): ItemInput {
                const unit = data.unit as Unit;
                const conversionUnit = data.conversionUnit || null;
                const rule = conversionUnit ? getConversionRule(unit, conversionUnit) : undefined;
                if (unit === "Nos.") {
                    return { ...data, conversion: { value: "NA" }, conversionUnit: null, conversionFactor: null };
                }
                if (!rule) throw new BadRequestException(`Invalid conversion pair: ${unit} -> ${conversionUnit || "none"}`);
                const factor = rule.factor ?? Number(data.conversionFactor);
                if (!Number.isFinite(factor) || factor <= 0) throw new BadRequestException("Conversion factor must be greater than zero");
                if (rule.factor !== null && Math.abs(factor - rule.factor) > 0.000001) throw new BadRequestException("The Mtr/Ft conversion factor is fixed");
                return { ...data, conversion: { value: conversionLabel(unit, conversionUnit as Unit) }, conversionUnit, conversionFactor: String(rule.factor ?? factor) };
    }
}
