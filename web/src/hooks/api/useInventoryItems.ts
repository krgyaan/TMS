import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { handleQueryError } from "@/lib/react-query";
import { inventoryItemsService } from "@/services/api";
import type { InventoryItemPayload } from "@/types/inventory-item.types";

export type ItemMasterTeam = "accounts" | "operations";
export const inventoryItemsKey = ["inventory-items"] as const;
const serviceFor = (team: ItemMasterTeam) => inventoryItemsService[team];

export const useInventoryItems = (team: ItemMasterTeam, filters: { search?: string; itemName?: string; unit?: string; isActive?: string } = {}) =>
    useQuery({ queryKey: [...inventoryItemsKey, team, filters], queryFn: () => serviceFor(team).getAll({ ...filters, limit: 100 }) });

export const useInventoryItem = (team: ItemMasterTeam, id: number) =>
    useQuery({ queryKey: [...inventoryItemsKey, team, id], queryFn: () => serviceFor(team).getById(id), enabled: !!id });

const useItemMutation = (team: ItemMasterTeam, action: (data: InventoryItemPayload) => Promise<unknown>, message: string) => {
    const client = useQueryClient();
    return useMutation({
        mutationFn: action,
        onSuccess: () => { void client.invalidateQueries({ queryKey: [...inventoryItemsKey, team] }); toast.success(message); },
        onError: error => toast.error(handleQueryError(error)),
    });
};

export const useCreateInventoryItem = (team: ItemMasterTeam) => useItemMutation(team, data => serviceFor(team).create(data), "Item created successfully");
export const useUpdateInventoryItem = (team: ItemMasterTeam) => {
    const client = useQueryClient();
    return useMutation({
        mutationFn: ({ id, data }: { id: number; data: Partial<InventoryItemPayload> }) => serviceFor(team).update(id, data),
        onSuccess: () => { void client.invalidateQueries({ queryKey: [...inventoryItemsKey, team] }); toast.success("Item updated successfully"); },
        onError: error => toast.error(handleQueryError(error)),
    });
};
export const useDeleteInventoryItem = (team: ItemMasterTeam) => {
    const client = useQueryClient();
    return useMutation({
        mutationFn: (id: number) => serviceFor(team).deleteItem(id),
        onSuccess: () => { void client.invalidateQueries({ queryKey: [...inventoryItemsKey, team] }); toast.success("Item deleted successfully"); },
        onError: error => toast.error(handleQueryError(error)),
    });
};
