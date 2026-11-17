import { BadRequestException, ConflictException, Inject, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { and, desc, eq, getTableColumns, ilike, isNull, ne, or, sql, type SQL } from "drizzle-orm";
import { DRIZZLE } from "@db/database.module";
import type { DbInstance } from "@db";
import { inventoryItems, type InventoryItem } from "@db/schemas/accounts/inventory-items.schema";
import { teams } from "@db/schemas/master/teams.schema";
import { users } from "@db/schemas/auth/users.schema";
import { resolveConversion } from "./conversion-rules";
import { fieldIsVisible, findCatalogItem, getAllowedConversionPairs, getAllowedUnits, getItemMainCategory } from "./item-catalog";
import { generateTemplatedItemCode } from "./item-code-generator";
import { validateCatalogItemValues } from "./item-catalog-validation";

type ListOptions = { teamId?: number; itemGroup?: string; category?: string; search?: string; page?: number; limit?: number; itemName?: string; unit?: string; isActive?: boolean };
type ItemInput = {
    teamId?: number | null;
    itemGroup?: string | null;
    category: string;
    modelNumber?: string | null;
    itemName: string;
    itemType?: string | null;
    makeBrand?: string | null;
    description?: string | null;
    specifications: Record<string, string>;
    unit: string;
    conversionUnit?: string | null;
    conversionFactor?: string | number | null;
    hsnCode?: string | null;
    isActive: boolean;
};
type ItemMasterResponse = InventoryItem & { createdByName: string };
type ItemCodePreviewInput = { category: string; itemName: string; specifications: Record<string, string> };
type ItemCodeQueryDb = Pick<DbInstance, "select" | "execute">;

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
                ilike(inventoryItems.modelNumber, `%${search}%`),
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

    async findById(id: number, db: Pick<DbInstance, "select"> = this.db): Promise<ItemMasterResponse> {
        const [item] = await db.select({ ...getTableColumns(inventoryItems), createdByName: sql<string>`coalesce(${users.name}, '—')` })
            .from(inventoryItems)
            .leftJoin(users, eq(inventoryItems.createdBy, users.id))
            .where(and(eq(inventoryItems.id, id), isNull(inventoryItems.deletedAt)))
            .limit(1);
        if (!item) throw new NotFoundException(`Inventory item with ID ${id} not found`);
        return item;
    }

    previewItemCode({ category, itemName, specifications }: ItemCodePreviewInput) {
        const catalogItem = findCatalogItem(category, itemName);
        if (!catalogItem) throw new BadRequestException(`Item "${itemName}" is not configured in category "${category}"`);
        if (catalogItem.pending) throw new BadRequestException(`${catalogItem.name} is pending finalization and cannot be created`);
        if (!catalogItem.codeTemplate) return { itemCode: null, message: "ITM sequence assigned on save" };
        const itemCode = generateTemplatedItemCode(category, itemName, specifications);
        return { itemCode: itemCode ?? null, message: itemCode || "Select all options to generate the code" };
    }

    async create(data: ItemInput, authenticatedUserId: number): Promise<ItemMasterResponse> {
        const { teamId: _ignoredTeamId, ...itemData } = data;
        void _ignoredTeamId;
        const catalogItem = findCatalogItem(itemData.category, itemData.itemName);
        if (catalogItem?.pending) throw new BadRequestException(`${catalogItem.name} is pending finalization and cannot be created`);
        if (!getAllowedUnits(itemData.category, itemData.itemName, itemData.specifications).some(unit => unit === itemData.unit)) throw new BadRequestException(`Unit ${itemData.unit} is not valid for ${itemData.itemName}`);
        const hsnCode = itemData.hsnCode?.trim() || null;
        if (!catalogItem?.hsnNotApplicable && !hsnCode) throw new BadRequestException("HSN code is required");
        if (hsnCode && !/^\d{4,8}$/.test(hsnCode)) throw new BadRequestException("HSN code must contain 4 to 8 digits");
        const validationError = validateCatalogItemValues(itemData.category, itemData.itemName, itemData.itemType, itemData.specifications);
        if (validationError) throw new BadRequestException(validationError);
        const cleanSpecifications = this.applicableSpecifications(itemData.category, itemData.itemName, itemData.specifications);
        const typeField = catalogItem?.fields.find(field => field.listColumn === "type");
        const resolvedItemType = typeField ? cleanSpecifications[typeField.key] || null : itemData.itemType?.trim() || null;

        const generatedCode = catalogItem?.codeTemplate
            ? generateTemplatedItemCode(itemData.category, itemData.itemName, cleanSpecifications)
            : undefined;
        if (catalogItem?.codeTemplate && !generatedCode) {
            throw new BadRequestException("Select all code-forming options to generate the item code");
        }
        const conversion = this.resolveItemConversion(itemData.unit, itemData.conversionUnit, itemData.conversionFactor, cleanSpecifications, getAllowedConversionPairs(itemData.category, itemData.itemName, cleanSpecifications));
        const itemCode = generatedCode || await this.nextItemCode();
        await this.ensureUnique(itemData, itemCode, undefined, this.db, true);
        let inserted: { id: number } | undefined;
        try {
            [inserted] = await this.db.insert(inventoryItems).values({
                ...itemData,
                specifications: cleanSpecifications,
                itemGroup: itemData.itemGroup ?? null,
                teamId: null,
                category: itemData.category,
                modelNumber: itemData.modelNumber?.trim() || null,
                makeBrand: itemData.makeBrand?.trim() || null,
                itemType: resolvedItemType,
                hsnCode,
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
        return this.db.transaction(tx => this.updateInTransaction(tx, id, data, authenticatedUserId));
    }

    private async updateInTransaction(tx: Pick<DbInstance, "select" | "update" | "execute">, id: number, data: Partial<ItemInput>, authenticatedUserId: number): Promise<ItemMasterResponse> {
        await tx.execute(sql`SELECT id FROM inventory_items WHERE id = ${id} AND deleted_at IS NULL FOR UPDATE`);
        const current = await this.findById(id, tx);
        const { teamId: _ignoredTeamId, ...itemData } = data;
        void _ignoredTeamId;
        const updatedValues = { ...current, ...itemData };
        const category = itemData.category || getItemMainCategory(current.itemName, current.category);
        let mergedSpecifications = { ...(current.specifications || {}), ...(itemData.specifications || {}) };
        const currentCategory = getItemMainCategory(current.itemName, current.category);
        const currentCatalogItem = findCatalogItem(currentCategory, current.itemName);
        const currentTypeFieldForMerge = currentCatalogItem?.fields.find(field => field.listColumn === "type");
        if (currentTypeFieldForMerge && current.itemType && !mergedSpecifications[currentTypeFieldForMerge.key]) {
            mergedSpecifications = { ...mergedSpecifications, [currentTypeFieldForMerge.key]: current.itemType };
        }
        const targetCatalogItem = findCatalogItem(category, updatedValues.itemName);
        const specifications = this.applicableSpecifications(category, updatedValues.itemName, mergedSpecifications);
        const targetTypeField = targetCatalogItem?.fields.find(field => field.listColumn === "type");
        const resolvedItemType = targetTypeField ? specifications[targetTypeField.key] || null : updatedValues.itemType;
        if (targetCatalogItem && itemData.specifications) {
            const invalidHiddenField = targetCatalogItem.fields.find(field => itemData.specifications?.[field.key]?.trim() && !fieldIsVisible(mergedSpecifications, field));
            if (invalidHiddenField) throw new BadRequestException(`${invalidHiddenField.label} is not available for the selected options`);
        }
        const currentTypeField = currentCatalogItem?.fields.find(field => field.listColumn === "type");
        const currentSpecificationsForCode = { ...(current.specifications || {}), ...(currentTypeField && current.itemType && !current.specifications?.[currentTypeField.key] ? { [currentTypeField.key]: current.itemType } : {}) };
        const codeIsCatalogGenerated = Boolean(currentCatalogItem?.codeTemplate && current.itemCode === generateTemplatedItemCode(currentCategory, current.itemName, currentSpecificationsForCode));
        let nextItemCode = current.itemCode;

        const codeKeys = new Set([
            ...[currentCatalogItem?.codeTemplate, targetCatalogItem?.codeTemplate].filter((template): template is string => Boolean(template))
                .flatMap(template => [...template.matchAll(/\{([A-Za-z0-9_]+)\}/g)].map(match => match[1])),
        ]);
        const changedCodeField = itemData.category !== undefined && itemData.category !== current.category
            || itemData.itemName !== undefined && itemData.itemName !== current.itemName
            || [...codeKeys].some(key => specifications[key] !== currentSpecificationsForCode[key]);
        if (changedCodeField && targetCatalogItem?.codeTemplate) {
            nextItemCode = generateTemplatedItemCode(category, updatedValues.itemName, specifications) || "";
            if (!nextItemCode) throw new BadRequestException("Select valid values for all code-forming fields");
        } else if (changedCodeField && codeIsCatalogGenerated) {
            nextItemCode = await this.nextItemCode();
        }

        if (itemData.category !== undefined || itemData.itemName !== undefined || itemData.specifications !== undefined) {
            const validationError = validateCatalogItemValues(
                category,
                updatedValues.itemName,
                resolvedItemType,
                specifications,
                Object.keys(current.specifications || {}),
                !codeIsCatalogGenerated && !changedCodeField,
            );
            if (validationError) throw new BadRequestException(validationError);
        }
        if (((itemData.unit !== undefined && itemData.unit !== current.unit) || changedCodeField)
            && !getAllowedUnits(category, updatedValues.itemName, specifications).some(unit => unit === updatedValues.unit)) {
            throw new BadRequestException(`Unit ${itemData.unit} is not valid for ${updatedValues.itemName}`);
        }
        const hsnCode = itemData.hsnCode === undefined ? current.hsnCode : itemData.hsnCode?.trim() || null;
        if (itemData.hsnCode !== undefined && !targetCatalogItem?.hsnNotApplicable && !hsnCode) throw new BadRequestException("HSN code is required");
        if (hsnCode && !/^\d{4,8}$/.test(hsnCode)) throw new BadRequestException("HSN code must contain 4 to 8 digits");

        const uniquenessData = { ...updatedValues, category, specifications };
        if (nextItemCode !== current.itemCode) await this.assertItemCodeAvailable(nextItemCode, id, tx);
        await this.ensureUnique(uniquenessData, nextItemCode, id, tx, true);
        const conversion = this.resolveItemConversion(
            updatedValues.unit,
            updatedValues.conversionUnit,
            updatedValues.conversionFactor,
            specifications,
            getAllowedConversionPairs(category, updatedValues.itemName, specifications),
        );
        const values = {
            itemName: updatedValues.itemName,
            itemType: resolvedItemType,
            category: updatedValues.category ?? null,
            modelNumber: updatedValues.modelNumber?.trim() || null,
            makeBrand: updatedValues.makeBrand?.trim() || null,
            description: updatedValues.description,
            specifications,
            unit: updatedValues.unit,
            hsnCode,
            isActive: updatedValues.isActive,
            ...conversion,
            itemGroup: updatedValues.itemGroup ?? null,
            updatedBy: authenticatedUserId,
            updatedAt: new Date(),
            itemCode: nextItemCode,
        };
        let updated: { id: number } | undefined;
        try {
            [updated] = await tx.update(inventoryItems).set(values).where(eq(inventoryItems.id, id)).returning({ id: inventoryItems.id });
        } catch (error) {
            if (this.isUniqueViolation(error)) throw new ConflictException(`Item code ${nextItemCode} already exists`);
            throw error;
        }
        if (!updated) throw new NotFoundException(`Inventory item with ID ${id} not found`);
        return this.findById(updated.id, tx);
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

    private async ensureUnique(
        data: Pick<ItemInput, "itemName" | "unit" | "makeBrand" | "modelNumber" | "specifications">,
        itemCode: string,
        excludeId?: number,
        db: ItemCodeQueryDb = this.db,
        forceBusinessKey = false,
    ) {
        let candidates: { id: number; itemCode: string; modelNumber: string | null; specifications: Record<string, string>; makeBrand: string | null }[];
        const usesBusinessKey = forceBusinessKey || itemCode.startsWith("ITM-") || /^[A-Z]+-\d{3}$/.test(itemCode);
        if (usesBusinessKey) {
            const normalizedName = data.itemName.trim().toLowerCase();
            const normalizedBrand = (data.makeBrand || "").trim().toLowerCase();
            const filters: SQL[] = [
                isNull(inventoryItems.deletedAt),
                sql`lower(trim(${inventoryItems.itemName})) = ${normalizedName}`,
                sql`lower(trim(coalesce(${inventoryItems.makeBrand}, ''))) = ${normalizedBrand}`,
                eq(inventoryItems.unit, data.unit),
            ];
            if (excludeId !== undefined) filters.push(ne(inventoryItems.id, excludeId));
            candidates = await db.select({ id: inventoryItems.id, itemCode: inventoryItems.itemCode, modelNumber: inventoryItems.modelNumber, specifications: inventoryItems.specifications, makeBrand: inventoryItems.makeBrand })
                .from(inventoryItems).where(and(...filters));
        } else {
            const filters: SQL[] = [eq(inventoryItems.itemCode, itemCode)];
            if (excludeId !== undefined) filters.push(ne(inventoryItems.id, excludeId));
            candidates = await db.select({ id: inventoryItems.id, itemCode: inventoryItems.itemCode, modelNumber: inventoryItems.modelNumber, specifications: inventoryItems.specifications, makeBrand: inventoryItems.makeBrand })
                .from(inventoryItems).where(and(...filters)).limit(1);
        }
        const normalize = (value: unknown): string => String(value ?? "").trim().toLowerCase();
        const normalizedSpecifications = (value: Record<string, string> | null | undefined) => Object.entries(value || {}).sort(([a], [b]) => a.localeCompare(b)).map(([key, entry]) => `${normalize(key)}=${normalize(entry)}`).join("&");
        const duplicate = candidates.find(candidate => usesBusinessKey
            ? normalize(candidate.makeBrand) === normalize(data.makeBrand) && normalize(candidate.modelNumber) === normalize(data.modelNumber) && normalizedSpecifications(candidate.specifications) === normalizedSpecifications(data.specifications)
            : true);
        if (duplicate) {
            if (usesBusinessKey) {
                throw new ConflictException(`An item with the same name, make/brand and unit already exists (code ${duplicate.itemCode})`);
            }
            throw new ConflictException(`Item code ${duplicate.itemCode} already exists`);
        }
    }

    private async assertItemCodeAvailable(itemCode: string, excludeId: number, db: Pick<DbInstance, "select"> = this.db) {
        const [existing] = await db.select({ id: inventoryItems.id })
            .from(inventoryItems)
            .where(and(eq(inventoryItems.itemCode, itemCode), ne(inventoryItems.id, excludeId)))
            .limit(1);
        if (existing) throw new ConflictException(`Item code ${itemCode} already exists`);
    }

    private isUniqueViolation(error: unknown): boolean {
        const candidate = error as { code?: string; cause?: { code?: string } };
        return candidate?.code === "23505" || candidate?.cause?.code === "23505";
    }

    private resolveItemConversion(unit: string, conversionUnit: string | null | undefined, factor: unknown, specifications: Record<string, string>, allowedPairs?: { from: string; to: string }[]) {
        try {
            return resolveConversion(unit, conversionUnit, factor, specifications, allowedPairs);
        } catch (error) {
            throw new BadRequestException(error instanceof Error ? error.message : "Invalid item conversion");
        }
    }

    private applicableSpecifications(category: string, itemName: string, specifications: Record<string, string>) {
        const catalogItem = findCatalogItem(category, itemName);
        if (!catalogItem) return specifications;
        return Object.fromEntries(Object.entries(specifications).filter(([key]) => {
            const field = catalogItem.fields.find(candidate => candidate.key === key);
            return !field || fieldIsVisible(specifications, field);
        }));
    }

    private async nextItemCode() {
        const { rows } = await this.db.execute<{ nextval: string }>(sql`SELECT nextval('inventory_item_code_seq') AS nextval`);
        const nextValue = rows[0]?.nextval;
        if (!nextValue) throw new Error("Unable to generate an inventory item code");
        return `ITM-${String(nextValue).padStart(4, "0")}`;
    }
}
