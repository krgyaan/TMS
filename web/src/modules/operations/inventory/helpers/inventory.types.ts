export type InventoryWarehouseType = "ho_main" | "ho_sub" | "project_location";
export type InventoryWarehouseFilter = "all" | InventoryWarehouseType | "ho_depot";

export interface InventoryItem {
    id: number;
    projectId: number;
    warehouseId: number | null;
    warehouseType: InventoryWarehouseType | null;
    warehouseName: string | null;
    itemName: string;
    hsn: string | null;
    price: number;
    qty: number;
    remainingQty: number;
    sourcePoNumber?: string | null;
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