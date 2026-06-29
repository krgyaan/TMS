import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { circularService } from "@/services/api/circular.service";
import type { Circular } from "@/types/api.types";
import { handleQueryError } from "@/lib/react-query";
import { toast } from "sonner";

export const circularKey = {
    all: ["circulars"] as const,
    lists: () => [...circularKey.all, "list"] as const,
    list: (filters?: any) => [...circularKey.lists(), { filters }] as const,
    details: () => [...circularKey.all, "detail"] as const,
    detail: (id: number) => [...circularKey.details(), id] as const,
};

export const useCirculars = () => {
    return useQuery({
        queryKey: circularKey.lists(),
        queryFn: () => circularService.getAll(),
    });
};

export const useActiveCirculars = () => {
    return useQuery({
        queryKey: [...circularKey.lists(), "active"] as const,
        queryFn: () => circularService.getActive(),
    });
};


export const useCreateCircular = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (data: FormData | Partial<Circular>) => circularService.create(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: circularKey.lists() });
            toast.success("Circular created successfully");
        },
        onError: error => {
            toast.error(handleQueryError(error));
        },
    });
};

export const useUpdateCircular = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ id, data }: { id: number; data: FormData | Partial<Circular> }) => circularService.update(id, data),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: circularKey.lists() });
            queryClient.invalidateQueries({ queryKey: circularKey.detail(variables.id) });
            toast.success("Circular updated successfully");
        },
        onError: error => {
            toast.error(handleQueryError(error));
        },
    });
};

export const useDeleteCircular = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (id: number) => circularService.deleteCircular(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: circularKey.lists() });
            toast.success("Circular deleted successfully");
        },
        onError: error => {
            toast.error(handleQueryError(error));
        },
    });
};