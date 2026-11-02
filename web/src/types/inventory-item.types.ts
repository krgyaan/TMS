export interface InventoryItem {
    id: number;
    itemName: string;
    itemType: string | null;
    specifications: Record<string, string>;
    unit: string;
    conversion: Record<string, string>;
    hsnCode: string | null;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface InventoryItemsResponse {
    data: InventoryItem[];
    meta: { total: number; page: number; limit: number; totalPages: number };
}
