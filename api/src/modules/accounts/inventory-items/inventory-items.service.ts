import { ConflictException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { and, desc, eq, ilike, or, sql, type SQL } from "drizzle-orm";
import { DRIZZLE } from "@db/database.module";
import type { DbInstance } from "@db";
import { inventoryItems, type InventoryItem, type NewInventoryItem } from "@db/schemas/accounts/inventory-items.schema";

type ListOptions = { search?: string; page?: number; limit?: number; isActive?: boolean };
type ItemInput = Omit<NewInventoryItem, "id" | "createdAt" | "updatedAt">;

@Injectable()
export class InventoryItemsService {
    constructor(@Inject(DRIZZLE) private readonly db: DbInstance) {}

    async findAll(options: ListOptions = {}) {
        const page = Math.max(1, options.page || 1);
        const limit = Math.min(100, Math.max(1, options.limit || 25));
        const search = options.search?.trim();
        const filters: SQL[] = [
            search ? or(ilike(inventoryItems.itemName, `%${search}%`), ilike(inventoryItems.itemType, `%${search}%`), ilike(inventoryItems.hsnCode, `%${search}%`)) : undefined,
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

    async findById(id: number): Promise<InventoryItem> {
        const [item] = await this.db.select().from(inventoryItems).where(eq(inventoryItems.id, id)).limit(1);
        if (!item) throw new NotFoundException(`Inventory item with ID ${id} not found`);
        return item;
    }

    async create(data: ItemInput): Promise<InventoryItem> {
        await this.ensureUnique(data, undefined);
        const [item] = await this.db.insert(inventoryItems).values(data).returning();
        return item;
    }

    async update(id: number, data: Partial<ItemInput>): Promise<InventoryItem> {
        const current = await this.findById(id);
        await this.ensureUnique({ ...current, ...data }, id);
        const [item] = await this.db.update(inventoryItems).set({ ...data, updatedAt: new Date() }).where(eq(inventoryItems.id, id)).returning();
        return item;
    }

    async softDelete(id: number): Promise<void> {
        await this.findById(id);
        await this.db.update(inventoryItems).set({ isActive: false, updatedAt: new Date() }).where(eq(inventoryItems.id, id));
    }

    private async ensureUnique(data: Pick<ItemInput, "itemName" | "itemType" | "specifications">, excludeId?: number) {
        const candidates = await this.db.select({ id: inventoryItems.id }).from(inventoryItems).where(
            and(eq(inventoryItems.itemName, data.itemName), data.itemType ? eq(inventoryItems.itemType, data.itemType) : sql`${inventoryItems.itemType} is null`),
        );
        const duplicate = candidates.find(candidate => candidate.id !== excludeId);
        if (duplicate) {
            const [existing] = await this.db.select().from(inventoryItems).where(eq(inventoryItems.id, duplicate.id));
            if (JSON.stringify(existing?.specifications || {}) === JSON.stringify(data.specifications || {})) {
                throw new ConflictException("An item with the same name, type and specifications already exists");
            }
        }
    }
}
