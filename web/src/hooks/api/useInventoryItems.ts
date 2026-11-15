import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { handleQueryError } from "@/lib/react-query";
import { inventoryItemsService } from "@/services/api";
import type { InventoryItem, InventoryItemPayload } from "@/types/inventory-item.types";
import type { ItemMasterApi } from "@/services/api/inventory-items.service";

export type ItemMasterTeam = ItemMasterApi;
export const inventoryItemsKey = ["inventory-items"] as const;
const serviceFor = (team: ItemMasterTeam) => inventoryItemsService[team];

export type InventoryItemFilters = { search?: string; teamId?: number; itemGroup?: string; itemName?: string; unit?: string; isActive?: string; page?: number; limit?: number };
export const itemListKey = [...inventoryItemsKey, "list"] as const;

export const useInventoryItems = (team: ItemMasterTeam, filters: InventoryItemFilters = {}) =>
    useQuery({ queryKey: [...itemListKey, team, filters], queryFn: () => serviceFor(team).getAll(filters), placeholderData: previous => previous });

export const useInventoryItem = (team: ItemMasterTeam, id: number) =>
    useQuery({ queryKey: [...inventoryItemsKey, "detail", team, id], queryFn: () => serviceFor(team).getById(id), enabled: !!id });

export const useItemConversionOptions = (unit: string, width?: string, enabled = true, category?: string, itemName?: string, type?: string) =>
    useQuery({
        queryKey: [...inventoryItemsKey, "conversion-options", unit, width, category, itemName, type],
        queryFn: () => inventoryItemsService.master.getConversionOptions(unit, width, category, itemName, type),
        enabled: enabled && Boolean(unit),
    });

export const useItemCodePreview = (category: string, itemName: string, specifications: Record<string, string>, enabled = true) =>
    useQuery({
        queryKey: [...inventoryItemsKey, "code-preview", category, itemName, specifications],
        queryFn: () => inventoryItemsService.master.previewCode(category, itemName, specifications),
        enabled: enabled && Boolean(category && itemName),
        staleTime: 30_000,
    });

const useItemMutation = (action: (data: InventoryItemPayload) => Promise<InventoryItem>, message: string, includeCode = false) => {
    const client = useQueryClient();
    return useMutation({
        mutationFn: action,
        onSuccess: item => { void client.invalidateQueries({ queryKey: itemListKey }); toast.success(includeCode ? `${message}: ${item.itemCode}` : message); },
        onError: error => toast.error(handleQueryError(error)),
    });
};

export const useCreateInventoryItem = () => useItemMutation(data => inventoryItemsService.master.create(data), "Item created successfully", true);
export const useUpdateInventoryItem = () => {
    const client = useQueryClient();
    return useMutation({
        mutationFn: ({ id, data }: { id: number; data: Partial<InventoryItemPayload> }) => inventoryItemsService.master.update(id, data),
        onSuccess: () => { void client.invalidateQueries({ queryKey: itemListKey }); toast.success("Item updated successfully"); },
        onError: error => toast.error(handleQueryError(error)),
    });
};
export const useDeleteInventoryItem = () => {
    const client = useQueryClient();
    return useMutation({
        mutationFn: (id: number) => inventoryItemsService.master.deleteItem(id),
        onSuccess: () => { void client.invalidateQueries({ queryKey: itemListKey }); toast.success("Item deleted successfully"); },
        onError: error => toast.error(handleQueryError(error)),
    });
};
