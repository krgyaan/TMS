import { BaseApiService } from "./base.service";
import type { InventoryItem, InventoryItemsResponse } from "@/types/inventory-item.types";

class InventoryItemsService extends BaseApiService {
    constructor() { super("/inventory-items"); }

    getAll(params?: { search?: string; page?: number; limit?: number }): Promise<InventoryItemsResponse> {
        return this.get<InventoryItemsResponse>("", { params });
    }
    getById(id: number): Promise<InventoryItem> { return this.get<InventoryItem>(`/${id}`); }
    create(data: Omit<InventoryItem, "id" | "createdAt" | "updatedAt">): Promise<InventoryItem> { return this.post<InventoryItem>("", data); }
    update(id: number, data: Partial<InventoryItem>): Promise<InventoryItem> { return this.patch<InventoryItem>(`/${id}`, data); }
    deleteItem(id: number): Promise<void> { return this.delete<void>(`/${id}`); }
}

export const inventoryItemsService = new InventoryItemsService();
