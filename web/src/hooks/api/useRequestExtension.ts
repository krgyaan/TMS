import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { PaginatedResult } from '@/types/api.types';
import { toast } from 'sonner';
import { handleQueryError } from '@/lib/react-query';
import type { CreateRequestExtensionDto, RequestExtensionListParams, RequestExtensionListRow, UpdateRequestExtensionDto } from '@/modules/tendering/request-extension/helpers/requestExtension.types';
import { requestExtensionService } from '@/services/api/request-extension.service';

export const requestExtensionKey = {
    all: ['request-extension'] as const,
    lists: () => [...requestExtensionKey.all, 'list'] as const,
    list: (filters?: Record<string, unknown>) => [...requestExtensionKey.lists(), { filters }] as const,
    detail: (id: number) => [...requestExtensionKey.all, 'detail', id] as const,
};

export const useRequestExtensions = (
    pagination: { page: number; limit: number; search?: string } = { page: 1, limit: 50 },
    sort?: { sortBy?: string; sortOrder?: 'asc' | 'desc' }
) => {
    const params: RequestExtensionListParams = {
        page: pagination.page,
        limit: pagination.limit,
        ...(sort?.sortBy && { sortBy: sort.sortBy }),
        ...(sort?.sortOrder && { sortOrder: sort.sortOrder }),
        ...(pagination.search && { search: pagination.search }),
    };

    return useQuery<PaginatedResult<RequestExtensionListRow>>({
        queryKey: requestExtensionKey.list({
            page: pagination.page,
            limit: pagination.limit,
            search: pagination.search ?? undefined,
            sortBy: sort?.sortBy,
            sortOrder: sort?.sortOrder,
        }),
        queryFn: () => requestExtensionService.getAll(params),
        placeholderData: (previousData) => {
            if (previousData && typeof previousData === 'object' && 'data' in previousData && 'meta' in previousData) {
                return previousData;
            }
            return undefined;
        },
    });
};

export const useRequestExtensionsAll = () => {
    return useQuery<PaginatedResult<RequestExtensionListRow>>({
        queryKey: requestExtensionKey.list({ all: true }),
        queryFn: () => requestExtensionService.getAll(),
    });
};

export const useRequestExtension = (id: number | null) => {
    return useQuery<RequestExtensionListRow>({
        queryKey: requestExtensionKey.detail(id ?? 0),
        queryFn: () => requestExtensionService.getById(id!),
        enabled: !!id,
    });
};

export const useCreateRequestExtension = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (data: CreateRequestExtensionDto) => requestExtensionService.create(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: requestExtensionKey.lists() });
            toast.success('Request Extension created successfully');
        },
        onError: (error) => {
            toast.error(handleQueryError(error));
        },
    });
};

export const useUpdateRequestExtension = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ id, data }: { id: number; data: Omit<UpdateRequestExtensionDto, 'id'> }) =>
            requestExtensionService.update(id, data),
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: requestExtensionKey.lists() });
            queryClient.invalidateQueries({ queryKey: requestExtensionKey.detail(data.id) });
            toast.success('Request Extension updated successfully');
        },
        onError: (error) => {
            toast.error(handleQueryError(error));
        },
    });
};

export const useDeleteRequestExtension = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (id: number) => requestExtensionService.remove(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: requestExtensionKey.lists() });
            toast.success('Request Extension deleted successfully');
        },
        onError: (error) => {
            toast.error(handleQueryError(error));
        },
    });
};
