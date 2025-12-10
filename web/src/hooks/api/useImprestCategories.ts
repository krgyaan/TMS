import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { imprestCategoriesService } from "@/services";
import type { CreateImprestCategoryDto, UpdateImprestCategoryDto } from "@/types/api.types";
import { handleQueryError } from "@/lib/react-query";
import { toast } from "sonner";

export const imprestCategoriesKey = {
    all: ["imprestCategories"] as const,
    lists: () => [...imprestCategoriesKey.all, "list"] as const,
    list: (filters?: any) => [...imprestCategoriesKey.lists(), { filters }] as const,
    details: () => [...imprestCategoriesKey.all, "detail"] as const,
    detail: (id: number) => [...imprestCategoriesKey.details(), id] as const,
};

// Get all imprest categories
export const useImprestCategories = () => {
    return useQuery({
        queryKey: imprestCategoriesKey.lists(),
        queryFn: () => imprestCategoriesService.getAll(),
    });
};

// Get imprest category by ID
export const useImprestCategory = (id: number | null) => {
    return useQuery({
        queryKey: imprestCategoriesKey.detail(id!),
        queryFn: () => imprestCategoriesService.getById(id!),
        enabled: !!id,
    });
};

// Search imprest categories
export const useImprestCategorySearch = (query: string) => {
    return useQuery({
        queryKey: [...imprestCategoriesKey.all, "search", query],
        // queryFn: () => imprestCategoriesService.search(query),
        enabled: query.length > 0,
    });
};

// Create imprest category
export const useCreateImprestCategory = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (data: CreateImprestCategoryDto) => imprestCategoriesService.create(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: imprestCategoriesKey.lists() });
            toast.success("Imprest Category created successfully");
        },
        onError: error => {
            toast.error(handleQueryError(error));
        },
    });
};

// Update imprest category
export const useUpdateImprestCategory = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ id, data }: { id: number; data: UpdateImprestCategoryDto }) => imprestCategoriesService.update(id, data),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: imprestCategoriesKey.lists() });
            queryClient.invalidateQueries({
                queryKey: imprestCategoriesKey.detail(variables.id),
            });
            toast.success("Imprest Category updated successfully");
        },
        onError: error => {
            toast.error(handleQueryError(error));
        },
    });
};

// Delete imprest category
// export const useDeleteImprestCategory = () => {
//     const queryClient = useQueryClient();

//     return useMutation({
//         mutationFn: (id: number) => imprestCategoriesService.delete(id),
//         onSuccess: () => {
//             queryClient.invalidateQueries({ queryKey: imprestCategoriesKey.lists() });
//             toast.success('Imprest Category deleted successfully');
//         },
//         onError: (error) => {
//             toast.error(handleQueryError(error));
//         },
//     });
// };
