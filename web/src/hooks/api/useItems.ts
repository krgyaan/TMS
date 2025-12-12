import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { itemsService } from "@/services/api";
import type { Item } from "@/types/api.types";
import { handleQueryError } from "@/lib/react-query";
import { toast } from "sonner";

export const itemsKey = {
    all: ["items"] as const,
    lists: () => [...itemsKey.all, "list"] as const,
    list: (filters?: any) => [...itemsKey.lists(), { filters }] as const,
    details: () => [...itemsKey.all, "detail"] as const,
    detail: (id: number) => [...itemsKey.details(), id] as const,
};

export const useItems = () => {
    return useQuery({
        queryKey: itemsKey.lists(),
        queryFn: () => itemsService.getAll(),
    });
};

export const useItem = (id: number) => {
    return useQuery({
        queryKey: itemsKey.detail(id),
        queryFn: () => itemsService.getById(id),
        enabled: !!id,
    });
};

export const useCreateItem = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (data: Partial<Item>) => itemsService.create(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: itemsKey.lists() });
            toast.success("Item created successfully");
        },
        onError: error => {
            toast.error(handleQueryError(error));
        },
    });
};

export const useUpdateItem = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ id, data }: { id: number; data: Partial<Item> }) => itemsService.update(id, data),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: itemsKey.lists() });
            queryClient.invalidateQueries({ queryKey: itemsKey.detail(variables.id) });
            toast.success("Item updated successfully");
        },
        onError: error => {
            toast.error(handleQueryError(error));
        },
    });
};

export const useDeleteItem = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (id: number) => itemsService.deleteItem(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: itemsKey.lists() });
            toast.success("Item deleted successfully");
        },
        onError: error => {
            toast.error(handleQueryError(error));
        },
    });
};
