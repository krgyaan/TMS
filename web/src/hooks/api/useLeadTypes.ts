import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { leadTypesService } from "@/services/api";
import type { CreateLeadTypeDto, UpdateLeadTypeDto } from "@/types/api.types";
import { handleQueryError } from "@/lib/react-query";
import { toast } from "sonner";

export const leadTypesKey = {
    all: ["leadTypes"] as const,
    lists: () => [...leadTypesKey.all, "list"] as const,
    list: (filters?: any) => [...leadTypesKey.lists(), { filters }] as const,
    details: () => [...leadTypesKey.all, "detail"] as const,
    detail: (id: number) => [...leadTypesKey.details(), id] as const,
};

// Get all lead types
export const useLeadTypes = () => {
    return useQuery({
        queryKey: leadTypesKey.lists(),
        queryFn: () => leadTypesService.getAll(),
    });
};

// Get lead type by ID
export const useLeadType = (id: number | null) => {
    return useQuery({
        queryKey: leadTypesKey.detail(id!),
        queryFn: () => leadTypesService.getById(id!),
        enabled: !!id,
    });
};

// Search lead types
export const useLeadTypeSearch = (query: string) => {
    return useQuery({
        queryKey: [...leadTypesKey.all, "search", query],
        // queryFn: () => leadTypesService.search(query),
        enabled: query.length > 0,
    });
};

// Create lead type
export const useCreateLeadType = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (data: CreateLeadTypeDto) => leadTypesService.create(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: leadTypesKey.lists() });
            toast.success("Lead Type created successfully");
        },
        onError: error => {
            toast.error(handleQueryError(error));
        },
    });
};

// Update lead type
export const useUpdateLeadType = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ id, data }: { id: number; data: UpdateLeadTypeDto }) => leadTypesService.update(id, data),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: leadTypesKey.lists() });
            queryClient.invalidateQueries({ queryKey: leadTypesKey.detail(variables.id) });
            toast.success("Lead Type updated successfully");
        },
        onError: error => {
            toast.error(handleQueryError(error));
        },
    });
};

// Delete lead type
// export const useDeleteLeadType = () => {
//     const queryClient = useQueryClient();

//     return useMutation({
//         mutationFn: (id: number) => leadTypesService.delete(id),
//         onSuccess: () => {
//             queryClient.invalidateQueries({ queryKey: leadTypesKey.lists() });
//             toast.success('Lead Type deleted successfully');
//         },
//         onError: (error) => {
//             toast.error(handleQueryError(error));
//         },
//     });
// };
