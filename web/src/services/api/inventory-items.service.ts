import { BaseApiService } from "./base.service";
import type { InventoryItem, InventoryItemPayload, InventoryItemsResponse } from "@/types/inventory-item.types";

class InventoryItemsService extends BaseApiService {
    constructor(team: "accounts" | "operations") { super(`/${team}/item-master`); }

    getAll(params?: { search?: string; page?: number; limit?: number; teamId?: number; itemName?: string; unit?: string; isActive?: string }): Promise<InventoryItemsResponse> {
        return this.get<InventoryItemsResponse>("", { params });
    }
    getById(id: number): Promise<InventoryItem> { return this.get<InventoryItem>(`/${id}`); }
    create(data: InventoryItemPayload): Promise<InventoryItem> { return this.post<InventoryItem>("", data); }
    update(id: number, data: Partial<InventoryItemPayload>): Promise<InventoryItem> { return this.patch<InventoryItem>(`/${id}`, data); }
    deleteItem(id: number): Promise<void> { return this.delete<void>(`/${id}`); }
}

export const inventoryItemsService = {
    accounts: new InventoryItemsService("accounts"),
    operations: new InventoryItemsService("operations"),
};
