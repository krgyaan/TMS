import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { handleQueryError } from "@/lib/react-query";
import { inventoryItemsService } from "@/services/api";
import type { InventoryItem, InventoryItemPayload } from "@/types/inventory-item.types";
import type { ItemMasterScope as ServiceScope } from "@/services/api/inventory-items.service";

export type ItemMasterScope = ServiceScope;
export const inventoryItemsKey = ["inventory-items"] as const;
const serviceFor = (scope: ItemMasterScope) => inventoryItemsService[scope];

export type InventoryItemFilters = { search?: string; page?: number; limit?: number };
export const itemListKey = [...inventoryItemsKey, "list"] as const;

export const useInventoryItems = (scope: ItemMasterScope, filters: InventoryItemFilters = {}) =>
    useQuery({ queryKey: [...itemListKey, scope, filters], queryFn: () => serviceFor(scope).getAll(filters), placeholderData: previous => previous });

export const useInventoryItem = (scope: ItemMasterScope, id: number) =>
    useQuery({ queryKey: [...inventoryItemsKey, "detail", scope, id], queryFn: () => serviceFor(scope).getById(id), enabled: !!id });

export const useItemConversionOptions = (unit: string, width?: string) =>
    useQuery({
        queryKey: [...inventoryItemsKey, "conversion-options", unit, width],
        queryFn: () => inventoryItemsService.master.getConversionOptions(unit, width),
        enabled: Boolean(unit) && unit !== "Nos.",
    });

const useItemMutation = (action: (data: InventoryItemPayload) => Promise<unknown>, message: string) => {
    const client = useQueryClient();
    return useMutation({
        mutationFn: action,
        onSuccess: () => { void client.invalidateQueries({ queryKey: itemListKey }); toast.success(message); },
    });
};

export const useCreateInventoryItem = () => useItemMutation(data => inventoryItemsService.master.create(data), "Item created successfully");
export const useUpdateInventoryItem = () => {
    const client = useQueryClient();
    return useMutation({
        mutationFn: ({ id, data }: { id: number; data: Partial<InventoryItemPayload> }) => inventoryItemsService.master.update(id, data),
        onSuccess: updatedItem => {
            const item = updatedItem as InventoryItem;
            for (const [queryKey, cachedItem] of client.getQueriesData<InventoryItem>({ queryKey: [...inventoryItemsKey, "detail"] })) {
                if (queryKey[3] === item.id && cachedItem !== undefined) client.setQueryData(queryKey, item);
            }
            void client.invalidateQueries({ queryKey: itemListKey });
            toast.success("Item updated successfully");
        },
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
