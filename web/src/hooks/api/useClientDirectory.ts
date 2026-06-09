import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { clientDirectoryService } from '@/services/api/client-directory.service';
import type { ClientDirectoryRow, ClientDirectoryListParams, CreateClientDirectoryDto, UpdateClientDirectoryDto } from '@/modules/shared/client-directory/helpers/client-directory.types';
import type { PaginatedResult } from '@/types/api.types';
import { toast } from 'sonner';
import { handleQueryError } from '@/lib/react-query';

export const clientDirectoryKey = {
    all: ['client-directory'] as const,
    lists: () => [...clientDirectoryKey.all, 'list'] as const,
    list: (filters?: Record<string, unknown>) => [...clientDirectoryKey.lists(), { filters }] as const,
    detail: (id: number) => [...clientDirectoryKey.all, 'detail', id] as const,
};

export const useClientDirectories = (
    pagination: { page: number; limit: number; search?: string } = { page: 1, limit: 50 },
    sort?: { sortBy?: string; sortOrder?: 'asc' | 'desc' },
) => {
    const params: ClientDirectoryListParams = {
        page: pagination.page,
        limit: pagination.limit,
        ...(sort?.sortBy && { sortBy: sort.sortBy }),
        ...(sort?.sortOrder && { sortOrder: sort.sortOrder }),
        ...(pagination.search && { search: pagination.search }),
    };

    return useQuery<PaginatedResult<ClientDirectoryRow>>({
        queryKey: clientDirectoryKey.list({
            page: pagination.page,
            limit: pagination.limit,
            search: pagination.search ?? undefined,
            sortBy: sort?.sortBy,
            sortOrder: sort?.sortOrder,
        }),
        queryFn: () => clientDirectoryService.getAll(params),
        placeholderData: (previousData) => {
            if (previousData && typeof previousData === 'object' && 'data' in previousData && 'meta' in previousData) {
                return previousData;
            }
            return undefined;
        },
    });
};

export const useClientDirectory = (id: number | null) => {
    return useQuery<ClientDirectoryRow>({
        queryKey: clientDirectoryKey.detail(id ?? 0),
        queryFn: () => clientDirectoryService.getById(id!),
        enabled: !!id,
    });
};

export const useCreateClientDirectory = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (data: CreateClientDirectoryDto) => clientDirectoryService.create(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: clientDirectoryKey.lists() });
            toast.success('Client created successfully');
        },
        onError: (error) => {
            toast.error(handleQueryError(error));
        },
    });
};

export const useUpdateClientDirectory = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ id, data }: { id: number; data: UpdateClientDirectoryDto }) =>
            clientDirectoryService.update(id, data),
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: clientDirectoryKey.lists() });
            queryClient.invalidateQueries({ queryKey: clientDirectoryKey.detail(data.id) });
            toast.success('Client updated successfully');
        },
        onError: (error) => {
            toast.error(handleQueryError(error));
        },
    });
};

export const useDeleteClientDirectory = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (id: number) => clientDirectoryService.remove(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: clientDirectoryKey.lists() });
            toast.success('Client deleted successfully');
        },
        onError: (error) => {
            toast.error(handleQueryError(error));
        },
    });
};
