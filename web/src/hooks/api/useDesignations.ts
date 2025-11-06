import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { followupCategoriesService } from '@/services/api';
import type {
    CreateDesignationDto,
    UpdateDesignationDto,
} from '@/types/api.types';
import { handleQueryError } from '@/lib/react-query';
import { toast } from 'sonner';

export const followupCategoriesKey = {
    all: ['followupCategories'] as const,
    lists: () => [...followupCategoriesKey.all, 'list'] as const,
    list: (filters?: any) => [...followupCategoriesKey.lists(), { filters }] as const,
    details: () => [...followupCategoriesKey.all, 'detail'] as const,
    detail: (id: number) => [...followupCategoriesKey.details(), id] as const,
};

// Get all followup categories
export const useDesignations = () => {
    return useQuery({
        queryKey: followupCategoriesKey.lists(),
        queryFn: () => followupCategoriesService.getAll(),
    });
};

// Get followup category by ID
export const useDesignation = (id: number | null) => {
    return useQuery({
        queryKey: followupCategoriesKey.detail(id!),
        queryFn: () => followupCategoriesService.getById(id!),
        enabled: !!id,
    });
};

// Search followup categories
export const useDesignationSearch = (query: string) => {
    return useQuery({
        queryKey: [...followupCategoriesKey.all, 'search', query],
        // queryFn: () => followupCategoriesService.search(query),
        enabled: query.length > 0,
    });
};

// Create followup category
export const useCreateDesignation = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (data: CreateDesignationDto) =>
            followupCategoriesService.create(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: followupCategoriesKey.lists() });
            toast.success('Followup Category created successfully');
        },
        onError: (error) => {
            toast.error(handleQueryError(error));
        },
    });
};

// Update followup category
export const useUpdateDesignation = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ id, data }: { id: number; data: UpdateDesignationDto }) =>
            followupCategoriesService.update(id, data),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: followupCategoriesKey.lists() });
            queryClient.invalidateQueries({
                queryKey: followupCategoriesKey.detail(variables.id),
            });
            toast.success('Followup Category updated successfully');
        },
        onError: (error) => {
            toast.error(handleQueryError(error));
        },
    });
};

// Delete followup category
// export const useDeleteDesignation = () => {
//     const queryClient = useQueryClient();

//     return useMutation({
//         mutationFn: (id: number) => followupCategoriesService.delete(id),
//         onSuccess: () => {
//             queryClient.invalidateQueries({ queryKey: followupCategoriesKey.lists() });
//             toast.success('Followup Category deleted successfully');
//         },
//         onError: (error) => {
//             toast.error(handleQueryError(error));
//         },
//     });
// };
