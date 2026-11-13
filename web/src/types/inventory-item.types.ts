export interface InventoryItem {
    id: number;
    itemCode: string;
    itemGroup?: string | null;
    teamId: number | null;
    category: string | null;
    subcategory: string | null;
    modelNumber: string | null;
    makeBrand: string | null;
    createdBy: number | null;
    updatedBy: number | null;
    createdByName?: string;
    updatedByName?: string | null;
    itemName: string;
    itemType: string | null;
    description: string | null;
    specifications: Record<string, string>;
    unit: string;
    conversion: Record<string, string>;
    conversionUnit: string | null;
    conversionFactor: string | null;
    hsnCode: string | null;
    isActive: boolean;
    deletedAt: string | null;
    createdAt: string;
    updatedAt: string;
}

export interface ItemConversionOption {
    to: string;
    factor: number | null;
    factorMode: "fixed" | "width" | "manual";
}

export interface InventoryItemsResponse {
    data: InventoryItem[];
    meta: { total: number; page: number; limit: number; totalPages: number };
}

export type InventoryItemPayload = Omit<InventoryItem, "id" | "itemCode" | "deletedAt" | "createdAt" | "updatedAt" | "conversion" | "conversionUnit" | "conversionFactor" | "teamId">
    & { itemGroup?: string | null; conversionUnit?: string | null; conversionFactor?: string | null; createdBy?: never; updatedBy?: never };
