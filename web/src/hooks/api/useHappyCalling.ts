import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { happyCallingService } from '@/services/api/happy-calling.service';
import { broadcastService } from '@/services/api/broadcast.service';
import type { HappyCallingRow, HappyCallingListParams, CreateHappyCallingDto, UpdateHappyCallingDto, BroadcastRow } from '@/modules/crm/happy-calling/helpers/happy-calling.types';
import type { PaginatedResult } from '@/types/api.types';
import { toast } from 'sonner';

export const happyCallingKey = {
    all: ['happy-calling'] as const,
    lists: () => [...happyCallingKey.all, 'list'] as const,
    list: (filters?: Record<string, unknown>) => [...happyCallingKey.lists(), { filters }] as const,
    detail: (id: number) => [...happyCallingKey.all, 'detail', id] as const,
};

export const broadcastKey = {
    all: ['broadcasts'] as const,
    lists: () => [...broadcastKey.all, 'list'] as const,
    detail: (id: number) => [...broadcastKey.all, 'detail', id] as const,
};

export const useHappyCallings = (
    pagination: { page: number; limit: number; search?: string } = { page: 1, limit: 50 },
    sort?: { sortBy?: string; sortOrder?: 'asc' | 'desc' },
) => {
    const params: HappyCallingListParams = {
        page: pagination.page,
        limit: pagination.limit,
        ...(sort?.sortBy && { sortBy: sort.sortBy }),
        ...(sort?.sortOrder && { sortOrder: sort.sortOrder }),
        ...(pagination.search && { search: pagination.search }),
    };

    return useQuery<PaginatedResult<HappyCallingRow>>({
        queryKey: happyCallingKey.list({
            page: pagination.page,
            limit: pagination.limit,
            search: pagination.search ?? undefined,
            sortBy: sort?.sortBy,
            sortOrder: sort?.sortOrder,
        }),
        queryFn: () => happyCallingService.getAll(params),
        placeholderData: (previousData) => {
            if (previousData && typeof previousData === 'object' && 'data' in previousData && 'meta' in previousData) {
                return previousData;
            }
            return undefined;
        },
    });
};

export const useHappyCalling = (id: number | null) => {
    return useQuery<HappyCallingRow>({
        queryKey: happyCallingKey.detail(id ?? 0),
        queryFn: () => happyCallingService.getById(id!),
        enabled: !!id,
    });
};

export const useCreateHappyCalling = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (data: CreateHappyCallingDto) => happyCallingService.create(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: happyCallingKey.lists() });
        },
        onError: (error: unknown) => {
            const err = error as { response?: { data?: { message?: string } }; message?: string };
            toast.error(err?.response?.data?.message || err?.message || 'Failed to create');
        },
    });
};

export const useUpdateHappyCalling = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, data }: { id: number; data: UpdateHappyCallingDto }) =>
            happyCallingService.update(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: happyCallingKey.lists() });
        },
        onError: (error: unknown) => {
            const err = error as { response?: { data?: { message?: string } }; message?: string };
            toast.error(err?.response?.data?.message || err?.message || 'Failed to update');
        },
    });
};

export const useBroadcasts = () => {
    return useQuery<BroadcastRow[]>({
        queryKey: broadcastKey.lists(),
        queryFn: () => broadcastService.getAll(),
    });
};

export const useCreateBroadcast = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (data: { name: string }) => broadcastService.create(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: broadcastKey.lists() });
        },
        onError: (error: unknown) => {
            const err = error as { response?: { data?: { message?: string } }; message?: string };
            toast.error(err?.response?.data?.message || err?.message || 'Failed to create broadcast');
        },
    });
};