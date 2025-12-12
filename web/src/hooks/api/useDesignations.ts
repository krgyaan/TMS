import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { designationsService } from '@/services/api';
import type {
    CreateDesignationDto,
    UpdateDesignationDto,
} from '@/types/api.types';
import { handleQueryError } from '@/lib/react-query';
import { toast } from 'sonner';

export const designationKey = {
    all: ['designations'] as const,
    lists: () => [...designationKey.all, 'list'] as const,
    list: (filters?: any) => [...designationKey.lists(), { filters }] as const,
    details: () => [...designationKey.all, 'detail'] as const,
    detail: (id: number) => [...designationKey.details(), id] as const,
};

// Get all followup categories
export const useDesignations = () => {
    return useQuery({
        queryKey: designationKey.lists(),
        queryFn: () => designationsService.getAll(),
    });
};

// Get followup category by ID
export const useDesignation = (id: number | null) => {
    return useQuery({
        queryKey: designationKey.detail(id!),
        queryFn: () => designationsService.getById(id!),
        enabled: !!id,
    });
};

// Search followup categories
export const useDesignationSearch = (query: string) => {
    return useQuery({
        queryKey: [...designationKey.all, 'search', query],
        // queryFn: () => followupCategoriesService.search(query),
        enabled: query.length > 0,
    });
};

// Create followup category
export const useCreateDesignation = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (data: CreateDesignationDto) =>
            designationsService.create(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: designationKey.lists() });
            toast.success('Designation created successfully');
        },
        onError: error => {
            toast.error(handleQueryError(error));
        },
    });
};

// Update followup category
export const useUpdateDesignation = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ id, data }: { id: number; data: UpdateDesignationDto }) =>
            designationsService.update(id, data),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: designationKey.lists() });
            queryClient.invalidateQueries({
                queryKey: designationKey.detail(variables.id),
            });
            toast.success('Designation updated successfully');
        },
        onError: error => {
            toast.error(handleQueryError(error));
        },
    });
};

export const useDeleteDesignation = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (id: number) => designationsService.deleteDesignation(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: designationKey.lists() });
            toast.success('Designation deleted successfully');
        },
        onError: (error) => {
            toast.error(handleQueryError(error));
        },
    });
};
