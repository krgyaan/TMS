import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { pqrService } from '@/services/api/pqr.service';
import type { PqrListRow, PqrListParams, CreatePqrDto, UpdatePqrDto } from '@/modules/shared/pqr/helpers/pqr.types';
import type { PaginatedResult } from '@/types/api.types';
import { toast } from 'sonner';
import { handleQueryError } from '@/lib/react-query';

export const pqrKey = {
    all: ['pqr'] as const,
    lists: () => [...pqrKey.all, 'list'] as const,
    list: (filters?: Record<string, unknown>) => [...pqrKey.lists(), { filters }] as const,
    detail: (id: number) => [...pqrKey.all, 'detail', id] as const,
};

export const usePqrs = (
    pagination: { page: number; limit: number; search?: string } = { page: 1, limit: 50 },
    sort?: { sortBy?: string; sortOrder?: 'asc' | 'desc' }
) => {
    const params: PqrListParams = {
        page: pagination.page,
        limit: pagination.limit,
        ...(sort?.sortBy && { sortBy: sort.sortBy }),
        ...(sort?.sortOrder && { sortOrder: sort.sortOrder }),
        ...(pagination.search && { search: pagination.search }),
    };

    return useQuery<PaginatedResult<PqrListRow>>({
        queryKey: pqrKey.list({
            page: pagination.page,
            limit: pagination.limit,
            search: pagination.search ?? undefined,
            sortBy: sort?.sortBy,
            sortOrder: sort?.sortOrder,
        }),
        queryFn: () => pqrService.getAll(params),
        placeholderData: (previousData) => {
            if (previousData && typeof previousData === 'object' && 'data' in previousData && 'meta' in previousData) {
                return previousData;
            }
            return undefined;
        },
    });
};

export const usePqr = (id: number | null) => {
    return useQuery<PqrListRow>({
        queryKey: pqrKey.detail(id ?? 0),
        queryFn: () => pqrService.getById(id!),
        enabled: !!id,
    });
};

export const useCreatePqr = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (data: CreatePqrDto) => pqrService.create(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: pqrKey.lists() });
            toast.success('PQR created successfully');
        },
        onError: (error) => {
            toast.error(handleQueryError(error));
        },
    });
};

export const useUpdatePqr = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ id, data }: { id: number; data: Omit<UpdatePqrDto, 'id'> }) =>
            pqrService.update(id, data),
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: pqrKey.lists() });
            queryClient.invalidateQueries({ queryKey: pqrKey.detail(data.id) });
            toast.success('PQR updated successfully');
        },
        onError: (error) => {
            toast.error(handleQueryError(error));
        },
    });
};

export const useDeletePqr = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (id: number) => pqrService.remove(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: pqrKey.lists() });
            toast.success('PQR deleted successfully');
        },
        onError: (error) => {
            toast.error(handleQueryError(error));
        },
    });
};
