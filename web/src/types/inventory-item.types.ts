export interface InventoryItem {
    id: number;
    itemCode: string;
    teamId: number;
    itemName: string;
    itemType: string | null;
    description: string | null;
    specifications: Record<string, string>;
    unit: string;
    hsnCode: string | null;
    isActive: boolean;
    deletedAt: string | null;
    createdAt: string;
    updatedAt: string;
}

export interface InventoryItemsResponse {
    data: InventoryItem[];
    meta: { total: number; page: number; limit: number; totalPages: number };
}

export type InventoryItemPayload = Omit<InventoryItem, "id" | "itemCode" | "deletedAt" | "createdAt" | "updatedAt">;
