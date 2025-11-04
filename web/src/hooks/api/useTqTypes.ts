import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { tqTypesService } from '@/services/api';
import type { TqType, CreateTqTypeDto, UpdateTqTypeDto } from '@/types/api.types';
import { handleQueryError } from '@/lib/react-query';
import { toast } from 'sonner';

export const tqTypesKey = {
    all: ['tqTypes'] as const,
    lists: () => [...tqTypesKey.all, 'list'] as const,
    list: (filters?: any) => [...tqTypesKey.lists(), { filters }] as const,
    details: () => [...tqTypesKey.all, 'detail'] as const,
    detail: (id: number) => [...tqTypesKey.details(), id] as const,
};

// Get all TQ types
export const useTqTypes = () => {
    return useQuery({
        queryKey: tqTypesKey.lists(),
        queryFn: () => tqTypesService.getAll(),
    });
};

// Get TQ type by ID
export const useTqType = (id: number | null) => {
    return useQuery({
        queryKey: tqTypesKey.detail(id!),
        queryFn: () => tqTypesService.getById(id!),
        enabled: !!id,
    });
};

// Search TQ types
export const useTqTypeSearch = (query: string) => {
    return useQuery({
        queryKey: [...tqTypesKey.all, 'search', query],
        queryFn: () => tqTypesService.search(query),
        enabled: query.length > 0,
    });
};

// Create TQ type
export const useCreateTqType = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (data: CreateTqTypeDto) => tqTypesService.create(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: tqTypesKey.lists() });
            toast.success('TQ Type created successfully');
        },
        onError: (error) => {
            toast.error(handleQueryError(error));
        },
    });
};

// Update TQ type
export const useUpdateTqType = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ id, data }: { id: number; data: UpdateTqTypeDto }) =>
            tqTypesService.update(id, data),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: tqTypesKey.lists() });
            queryClient.invalidateQueries({ queryKey: tqTypesKey.detail(variables.id) });
            toast.success('TQ Type updated successfully');
        },
        onError: (error) => {
            toast.error(handleQueryError(error));
        },
    });
};

// Delete TQ type
export const useDeleteTqType = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (id: number) => tqTypesService.delete(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: tqTypesKey.lists() });
            toast.success('TQ Type deleted successfully');
        },
        onError: (error) => {
            toast.error(handleQueryError(error));
        },
    });
};
