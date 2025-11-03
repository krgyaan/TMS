import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { websitesService } from '@/services/api';
import type { CreateWebsiteDto, UpdateWebsiteDto } from '@/types/api.types';
import { handleQueryError } from '@/lib/react-query';
import { toast } from 'sonner';

export const websitesKey = {
    all: ['websites'] as const,
    lists: () => [...websitesKey.all, 'list'] as const,
    list: (filters?: any) => [...websitesKey.lists(), { filters }] as const,
    details: () => [...websitesKey.all, 'detail'] as const,
    detail: (id: number) => [...websitesKey.details(), id] as const,
};

// Get all websites
export const useWebsites = () => {
    return useQuery({
        queryKey: websitesKey.lists(),
        queryFn: () => websitesService.getAll(),
    });
};

// Get website by ID
export const useWebsite = (id: number | null) => {
    return useQuery({
        queryKey: websitesKey.detail(id!),
        queryFn: () => websitesService.getById(id!),
        enabled: !!id,
    });
};

// Search websites
export const useWebsiteSearch = (query: string) => {
    return useQuery({
        queryKey: [...websitesKey.all, 'search', query],
        queryFn: () => websitesService.search(query),
        enabled: query.length > 0,
    });
};

// Create website
export const useCreateWebsite = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (data: CreateWebsiteDto) => websitesService.create(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: websitesKey.lists() });
            toast.success('Website created successfully');
        },
        onError: (error) => {
            toast.error(handleQueryError(error));
        },
    });
};

// Update website
export const useUpdateWebsite = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ id, data }: { id: number; data: UpdateWebsiteDto }) =>
            websitesService.update(id, data),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: websitesKey.lists() });
            queryClient.invalidateQueries({ queryKey: websitesKey.detail(variables.id) });
            toast.success('Website updated successfully');
        },
        onError: (error) => {
            toast.error(handleQueryError(error));
        },
    });
};

// Delete website
export const useDeleteWebsite = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (id: number) => websitesService.delete(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: websitesKey.lists() });
            toast.success('Website deleted successfully');
        },
        onError: (error) => {
            toast.error(handleQueryError(error));
        },
    });
};
