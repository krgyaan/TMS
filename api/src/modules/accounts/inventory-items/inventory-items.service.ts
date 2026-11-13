import { BadRequestException, ConflictException, Inject, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { and, desc, eq, getTableColumns, ilike, isNull, ne, or, sql, type SQL } from "drizzle-orm";
import { DRIZZLE } from "@db/database.module";
import type { DbInstance } from "@db";
import { inventoryItems, type InventoryItem } from "@db/schemas/accounts/inventory-items.schema";
import { teams } from "@db/schemas/master/teams.schema";
import { users } from "@db/schemas/auth/users.schema";
import { resolveConversion } from "./conversion-rules";
import { findCatalogItem } from "./item-catalog";
import { generateTemplatedItemCode } from "./item-code-generator";
import { validateCatalogItemValues } from "./item-catalog-validation";

type ListOptions = { teamId?: number; itemGroup?: string; category?: string; search?: string; page?: number; limit?: number; itemName?: string; unit?: string; isActive?: boolean };
type ItemInput = {
    teamId?: number | null;
    itemGroup?: string | null;
    category: string;
    itemName: string;
    itemType?: string | null;
    makeBrand?: string | null;
    description?: string | null;
    specifications: Record<string, string>;
    unit: string;
    conversionUnit?: string | null;
    conversionFactor?: string | number | null;
    hsnCode: string;
    isActive: boolean;
};
type ItemMasterResponse = InventoryItem & { createdByName: string };

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
            options.category ? eq(inventoryItems.category, options.category) : undefined,
            isNull(inventoryItems.deletedAt),
            search ? or(
                ilike(inventoryItems.itemCode, `%${search}%`),
                ilike(inventoryItems.itemName, `%${search}%`),
                ilike(inventoryItems.category, `%${search}%`),
                ilike(inventoryItems.itemType, `%${search}%`),
                ilike(inventoryItems.hsnCode, `%${search}%`),
                ilike(inventoryItems.makeBrand, `%${search}%`),
            ) : undefined,
            options.itemName ? eq(inventoryItems.itemName, options.itemName) : undefined,
            options.unit ? eq(inventoryItems.unit, options.unit) : undefined,
            options.isActive === undefined ? undefined : eq(inventoryItems.isActive, options.isActive),
        ].filter((filter): filter is SQL => Boolean(filter));
        const where = filters.length ? and(...filters) : undefined;
        const [data, count] = await Promise.all([
            this.db.select({ ...getTableColumns(inventoryItems), createdByName: sql<string>`coalesce(${users.name}, '—')` })
                .from(inventoryItems)
                .leftJoin(users, eq(inventoryItems.createdBy, users.id))
                .where(where)
                .orderBy(desc(inventoryItems.createdAt))
                .limit(limit)
                .offset((page - 1) * limit),
            this.db.select({ count: sql<number>`count(*)` }).from(inventoryItems).where(where),
        ]);
        const total = Number(count[0]?.count || 0);
        return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
    }

    async findById(id: number): Promise<ItemMasterResponse> {
        const [item] = await this.db.select({ ...getTableColumns(inventoryItems), createdByName: sql<string>`coalesce(${users.name}, '—')` })
            .from(inventoryItems)
            .leftJoin(users, eq(inventoryItems.createdBy, users.id))
            .where(and(eq(inventoryItems.id, id), isNull(inventoryItems.deletedAt)))
            .limit(1);
        if (!item) throw new NotFoundException(`Inventory item with ID ${id} not found`);
        return item;
    }

    async create(data: ItemInput, authenticatedUserId: number): Promise<ItemMasterResponse> {
        const { teamId: _ignoredTeamId, ...itemData } = data;
        void _ignoredTeamId;
        const catalogItem = findCatalogItem(itemData.category, itemData.itemName);
        const validationError = validateCatalogItemValues(itemData.category, itemData.itemName, itemData.itemType, itemData.specifications);
        if (validationError) throw new BadRequestException(validationError);

        const generatedCode = catalogItem?.codeTemplate
            ? generateTemplatedItemCode(itemData.category, itemData.itemName, itemData.specifications)
            : undefined;
        if (catalogItem?.codeTemplate && !generatedCode) {
            throw new BadRequestException("Select all code-forming options to generate the item code");
        }
        const itemCode = generatedCode || await this.nextItemCode();
        await this.ensureUnique(itemData, itemCode);
        const conversion = this.resolveItemConversion(itemData.unit, itemData.conversionUnit, itemData.conversionFactor, itemData.specifications || {});
        let inserted: { id: number } | undefined;
        try {
            [inserted] = await this.db.insert(inventoryItems).values({
                ...itemData,
                itemGroup: itemData.itemGroup ?? null,
                teamId: null,
                category: itemData.category,
                makeBrand: itemData.makeBrand?.trim() || null,
                itemType: itemData.itemType?.trim() || null,
                description: itemData.description?.trim() || null,
                ...conversion,
                createdBy: authenticatedUserId,
                updatedBy: authenticatedUserId,
                itemCode,
            }).returning({ id: inventoryItems.id });
        } catch (error) {
            if (this.isUniqueViolation(error)) throw new ConflictException(`Item code ${itemCode} already exists`);
            throw error;
        }
        if (!inserted) throw new Error("Unable to create inventory item");
        return this.findById(inserted.id);
    }

    async update(id: number, data: Partial<ItemInput>, authenticatedUserId: number): Promise<ItemMasterResponse> {
        const current = await this.findById(id);
        const { teamId: _ignoredTeamId, ...itemData } = data;
        void _ignoredTeamId;
        const updatedValues = { ...current, ...itemData };
        const category = updatedValues.category || "Legacy";
        const specifications = { ...(current.specifications || {}), ...(itemData.specifications || {}) };
        const currentCategory = current.category || "Legacy";
        const currentCatalogItem = findCatalogItem(currentCategory, current.itemName);
        const currentGeneratedCode = currentCatalogItem?.codeTemplate
            ? generateTemplatedItemCode(currentCategory, current.itemName, current.specifications || {})
            : undefined;
        const codeIsCatalogGenerated = Boolean(currentGeneratedCode && currentGeneratedCode === current.itemCode);

        if (codeIsCatalogGenerated && currentCatalogItem?.codeTemplate) {
            const codeKeys = [...currentCatalogItem.codeTemplate.matchAll(/\{([A-Za-z0-9_]+)\}/g)].map(match => match[1]);
            const changedCodeField = itemData.category !== undefined && itemData.category !== current.category
                || itemData.itemName !== undefined && itemData.itemName !== current.itemName
                || codeKeys.some(key => itemData.specifications?.[key] !== undefined && itemData.specifications[key] !== current.specifications?.[key]);
            if (changedCodeField) throw new BadRequestException("Code-forming fields cannot be changed after an item code is assigned");
        }

        if (itemData.category !== undefined || itemData.itemName !== undefined || itemData.specifications !== undefined) {
            const validationError = validateCatalogItemValues(
                category,
                updatedValues.itemName,
                updatedValues.itemType,
                specifications,
                Object.keys(current.specifications || {}),
            );
            if (validationError) throw new BadRequestException(validationError);
        }

        const uniquenessData = { ...updatedValues, category, specifications };
        if (!codeIsCatalogGenerated) await this.ensureUnique(uniquenessData, current.itemCode, id);
        const conversion = this.resolveItemConversion(
            updatedValues.unit,
            updatedValues.conversionUnit,
            updatedValues.conversionFactor,
            specifications,
        );
        const values = {
            itemName: updatedValues.itemName,
            itemType: updatedValues.itemType,
            category: updatedValues.category ?? null,
            makeBrand: updatedValues.makeBrand?.trim() || null,
            description: updatedValues.description,
            specifications,
            unit: updatedValues.unit,
            hsnCode: updatedValues.hsnCode,
            isActive: updatedValues.isActive,
            ...conversion,
            itemGroup: updatedValues.itemGroup ?? null,
            updatedBy: authenticatedUserId,
            updatedAt: new Date(),
        };
        const [updated] = await this.db.update(inventoryItems).set(values).where(eq(inventoryItems.id, id)).returning({ id: inventoryItems.id });
        if (!updated) throw new NotFoundException(`Inventory item with ID ${id} not found`);
        return this.findById(updated.id);
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

    private async ensureUnique(data: Pick<ItemInput, "itemName" | "unit" | "makeBrand">, itemCode: string, excludeId?: number) {
        let candidates: { id: number; itemCode: string }[];
        if (itemCode.startsWith("ITM-")) {
            const normalizedName = data.itemName.trim().toLowerCase();
            const normalizedBrand = (data.makeBrand || "").trim().toLowerCase();
            const filters: SQL[] = [
                isNull(inventoryItems.deletedAt),
                sql`lower(trim(${inventoryItems.itemName})) = ${normalizedName}`,
                sql`lower(trim(coalesce(${inventoryItems.makeBrand}, ''))) = ${normalizedBrand}`,
                eq(inventoryItems.unit, data.unit),
            ];
            if (excludeId !== undefined) filters.push(ne(inventoryItems.id, excludeId));
            candidates = await this.db.select({ id: inventoryItems.id, itemCode: inventoryItems.itemCode })
                .from(inventoryItems).where(and(...filters));
        } else {
            const filters: SQL[] = [eq(inventoryItems.itemCode, itemCode)];
            if (excludeId !== undefined) filters.push(ne(inventoryItems.id, excludeId));
            candidates = await this.db.select({ id: inventoryItems.id, itemCode: inventoryItems.itemCode })
                .from(inventoryItems).where(and(...filters)).limit(1);
        }
        const duplicate = candidates[0];
        if (duplicate) {
            if (itemCode.startsWith("ITM-")) {
                throw new ConflictException(`An item with the same name, make/brand and unit already exists (code ${duplicate.itemCode})`);
            }
            throw new ConflictException(`Item code ${duplicate.itemCode} already exists`);
        }
    }

    private isUniqueViolation(error: unknown): boolean {
        const candidate = error as { code?: string; cause?: { code?: string } };
        return candidate?.code === "23505" || candidate?.cause?.code === "23505";
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
}
