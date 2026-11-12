export interface InventoryItem {
    id: number;
    itemCode: string;
    itemGroup?: string | null;
    teamId: number | null;
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
    & { itemGroup?: string | null; conversionUnit?: string | null; conversionFactor?: string | null };
