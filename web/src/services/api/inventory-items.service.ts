import { BaseApiService } from "./base.service";
import type { InventoryItem, InventoryItemPayload, InventoryItemsResponse, ItemConversionOption } from "@/types/inventory-item.types";

export type ItemMasterScope = "accounts" | "operations" | "master";

class InventoryItemsReadService extends BaseApiService {
    constructor(scope: ItemMasterScope) { super(`/${scope}/item-master`); }

    getAll(params?: { search?: string; page?: number; limit?: number }): Promise<InventoryItemsResponse> {
        return this.get<InventoryItemsResponse>("", { params });
    }
    getById(id: number): Promise<InventoryItem> { return this.get<InventoryItem>(`/${id}`); }
}

class SettingsInventoryItemsService extends InventoryItemsReadService {
    getConversionOptions(unit: string, width?: string): Promise<ItemConversionOption[]> {
        return this.get<ItemConversionOption[]>("/conversion-options", { params: { unit, width } });
    }
import type { InventoryItem, InventoryItemPayload, InventoryItemsResponse } from "@/types/inventory-item.types";

class InventoryItemsService extends BaseApiService {
    constructor() { super("/inventory-items"); }

    getAll(params?: { search?: string; page?: number; limit?: number; itemGroup?: string; itemName?: string; unit?: string; isActive?: string }): Promise<InventoryItemsResponse> {
        return this.get<InventoryItemsResponse>("", { params });
    }
    getById(id: number): Promise<InventoryItem> { return this.get<InventoryItem>(`/${id}`); }
    create(data: InventoryItemPayload): Promise<InventoryItem> { return this.post<InventoryItem>("", data); }
    update(id: number, data: Partial<InventoryItemPayload>): Promise<InventoryItem> { return this.patch<InventoryItem>(`/${id}`, data); }
    deleteItem(id: number): Promise<void> { return this.delete<void>(`/${id}`); }
}

export const inventoryItemsService = new InventoryItemsService();
