import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { handleQueryError } from "@/lib/react-query";
import { inventoryItemsService } from "@/services/api";

export const inventoryItemsKey = ["inventory-items"] as const;

export const useInventoryItems = (search = "") =>
    useQuery({
        queryKey: [...inventoryItemsKey, { search }],
        queryFn: () => inventoryItemsService.getAll({ search, limit: 100 }),
    });

export const useInventoryItem = (id: number) =>
    useQuery({ queryKey: [...inventoryItemsKey, id], queryFn: () => inventoryItemsService.getById(id), enabled: !!id });

const useItemMutation = (action: (data: any) => Promise<unknown>, message: string) => {
    const client = useQueryClient();
    return useMutation({
        mutationFn: action,
        onSuccess: () => {
            void client.invalidateQueries({ queryKey: inventoryItemsKey });
            toast.success(message);
        },
        onError: error => toast.error(handleQueryError(error)),
    });
};

export const useCreateInventoryItem = () => useItemMutation(data => inventoryItemsService.create(data), "Item created successfully");
export const useUpdateInventoryItem = () => useItemMutation(({ id, data }) => inventoryItemsService.update(id, data), "Item updated successfully");
export const useDeleteInventoryItem = () => useItemMutation(id => inventoryItemsService.deleteItem(id), "Item deleted successfully");
