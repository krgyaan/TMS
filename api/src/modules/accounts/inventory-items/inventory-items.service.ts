import { BadRequestException, ConflictException, Inject, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { and, desc, eq, ilike, isNull, or, sql, type SQL } from "drizzle-orm";
import { DRIZZLE } from "@db/database.module";
import type { DbInstance } from "@db";
import { inventoryItems, type InventoryItem, type NewInventoryItem } from "@db/schemas/accounts/inventory-items.schema";
import { teams } from "@db/schemas/master/teams.schema";
import { resolveConversion } from "./conversion-rules";

type ListOptions = { teamId?: number; itemGroup?: string; search?: string; page?: number; limit?: number; itemName?: string; unit?: string; isActive?: boolean };
type ItemInput = Pick<NewInventoryItem, "itemName" | "itemType" | "description" | "specifications" | "unit" | "hsnCode" | "isActive">
    & { teamId?: number | null; itemGroup?: string | null }
    & { conversionUnit?: string | null; conversionFactor?: string | number | null };

@Injectable()
export class InventoryItemsService {
    private readonly logger = new Logger(InventoryItemsService.name);

    constructor(@Inject(DRIZZLE) private readonly db: DbInstance) {}

    async findAll(options: ListOptions) {
        const page = Math.max(1, options.page || 1);
        const limit = Math.min(100, Math.max(1, options.limit || 25));
        const search = options.search?.trim();
        if (options.teamId !== undefined) await this.validateTeamId(options.teamId);
        const filters: SQL[] = [
            options.teamId === undefined ? undefined : eq(inventoryItems.teamId, options.teamId),
            options.itemGroup ? eq(inventoryItems.itemGroup, options.itemGroup) : undefined,
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

    async findById(id: number): Promise<InventoryItem> {
        const [item] = await this.db.select().from(inventoryItems).where(and(eq(inventoryItems.id, id), isNull(inventoryItems.deletedAt))).limit(1);
        if (!item) throw new NotFoundException(`Inventory item with ID ${id} not found`);
        return item;
    }

    async create(data: ItemInput): Promise<InventoryItem> {
        const { teamId: _ignoredTeamId, ...itemData } = data;
        void _ignoredTeamId;
        await this.ensureUnique(itemData, undefined);
        const conversion = this.resolveItemConversion(itemData.unit, itemData.conversionUnit, itemData.conversionFactor, itemData.specifications || {});
        const [item] = await this.db.insert(inventoryItems).values({
            ...itemData, ...conversion,
            // The Drizzle schema still requires teamId; migration 0172 makes the database column nullable.
            teamId: null as unknown as number,
            itemCode: await this.nextItemCode(),
        }).returning();
        return item;
    }

    async update(id: number, data: Partial<ItemInput>): Promise<InventoryItem> {
        const current = await this.findById(id);
        const { teamId: _ignoredTeamId, ...itemData } = data;
        void _ignoredTeamId;
        const updatedValues = { ...current, ...itemData };
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
            isActive: updatedValues.isActive, ...conversion, itemGroup: updatedValues.itemGroup, updatedAt: new Date(),
        };
        const [item] = await this.db.update(inventoryItems).set(values).where(eq(inventoryItems.id, id)).returning();
        return item;
    }

    async softDelete(id: number): Promise<void> {
        await this.findById(id);
        await this.db.update(inventoryItems).set({ isActive: false, deletedAt: new Date(), updatedAt: new Date() }).where(eq(inventoryItems.id, id));
    }

    async validateTeamId(teamId: number): Promise<void> {
        try {
            const [team] = await this.db.select({ name: teams.name }).from(teams).where(eq(teams.id, teamId)).limit(1);
            if (!team || (team.name !== "AC" && team.name !== "DC")) {
                throw new BadRequestException("Team must be AC or DC");
            }
        } catch (error) {
            if (error instanceof BadRequestException) throw error;
            this.logger.error(`Failed to validate Item Master team ${teamId}`, error instanceof Error ? error.stack : undefined);
            throw error;
        }
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

    private async ensureUnique(data: Pick<ItemInput, "itemName" | "itemType" | "specifications"> & { itemGroup?: string | null }, excludeId?: number) {
        const candidates = await this.db.select({ id: inventoryItems.id }).from(inventoryItems).where(
            and(
                isNull(inventoryItems.deletedAt),
                data.itemGroup ? eq(inventoryItems.itemGroup, data.itemGroup) : isNull(inventoryItems.itemGroup),
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

}
