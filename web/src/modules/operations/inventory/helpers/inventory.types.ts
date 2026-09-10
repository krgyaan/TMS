export interface InventoryItem {
    id: number;
    projectId: number;
    itemName: string;
    hsn: string | null;
    price: number;
    qty: number;
    remainingQty: number;
}

export interface InventoryProjectSummary {
    projectId: number;
    projectName: string | null;
    projectCode: string | null;
    approvedPoCount: number;
    approvedVwoCount: number;
    totalItems: number;
}

export interface InventoryProjectSummaryFilters {
    page?: number;
    limit?: number;
    search?: string;
}

export interface InventoryTransfer {
    id: number;
    itemId: number;
    fromProject: number;
    toProject: number;
    qty: number;
    price: number;
    remark: string | null;
    transferredBy: string | null;
    createdAt: string;
    itemName: string | null;
    hsn: string | null;
}

export interface TransferDTO {
    itemId: number;
    fromProject: number;
    toProject: number;
    qty: number;
    price?: number;
    remark?: string;
}
