import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { handleQueryError } from "@/lib/react-query";
import { inventoryItemsService } from "@/services/api";
import type { InventoryItemPayload } from "@/types/inventory-item.types";

export type ItemMasterTeam = "accounts" | "operations";
export const inventoryItemsKey = ["inventory-items"] as const;
const serviceFor = (team: ItemMasterTeam) => inventoryItemsService[team];

export type InventoryItemFilters = { search?: string; teamId?: number; itemName?: string; unit?: string; isActive?: string; page?: number; limit?: number };
export const itemListKey = [...inventoryItemsKey, "list"] as const;

export const useInventoryItems = (team: ItemMasterTeam, filters: InventoryItemFilters = {}) =>
    useQuery({ queryKey: [...itemListKey, filters], queryFn: () => serviceFor(team).getAll(filters), placeholderData: previous => previous });

export const useInventoryItem = (team: ItemMasterTeam, id: number) =>
    useQuery({ queryKey: [...inventoryItemsKey, "detail", team, id], queryFn: () => serviceFor(team).getById(id), enabled: !!id });

const useItemMutation = (team: ItemMasterTeam, action: (data: InventoryItemPayload) => Promise<unknown>, message: string) => {
    const client = useQueryClient();
    return useMutation({
        mutationFn: action,
        onSuccess: () => { void client.invalidateQueries({ queryKey: itemListKey }); toast.success(message); },
    });
};

export const useCreateInventoryItem = (team: ItemMasterTeam) => useItemMutation(team, data => serviceFor(team).create(data), "Item created successfully");
export const useUpdateInventoryItem = (team: ItemMasterTeam) => {
    const client = useQueryClient();
    return useMutation({
        mutationFn: ({ id, data }: { id: number; data: Partial<InventoryItemPayload> }) => serviceFor(team).update(id, data),
        onSuccess: () => { void client.invalidateQueries({ queryKey: itemListKey }); toast.success("Item updated successfully"); },
    });
};
export const useDeleteInventoryItem = (team: ItemMasterTeam) => {
    const client = useQueryClient();
    return useMutation({
        mutationFn: (id: number) => serviceFor(team).deleteItem(id),
        onSuccess: () => { void client.invalidateQueries({ queryKey: itemListKey }); toast.success("Item deleted successfully"); },
        onError: error => toast.error(handleQueryError(error)),
    });
};
