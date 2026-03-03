import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { PaginatedResult } from '@/types/api.types';
import { toast } from 'sonner';
import { handleQueryError } from '@/lib/react-query';
import type { CreateSubmitQueryDto, SubmitQueryListParams, SubmitQueryListRow, UpdateSubmitQueryDto } from '@/modules/tendering/submit-queries/helpers/submitQueries.types';
import { submitQueryService } from '@/services/api/submit-query.service';

export const submitQueryKey = {
    all: ['submit-query'] as const,
    lists: () => [...submitQueryKey.all, 'list'] as const,
    list: (filters?: Record<string, unknown>) => [...submitQueryKey.lists(), { filters }] as const,
    detail: (id: number) => [...submitQueryKey.all, 'detail', id] as const,
};

export const useSubmitQuerys = (
    pagination: { page: number; limit: number; search?: string } = { page: 1, limit: 50 },
    sort?: { sortBy?: string; sortOrder?: 'asc' | 'desc' }
) => {
    const params: SubmitQueryListParams = {
        page: pagination.page,
        limit: pagination.limit,
        ...(sort?.sortBy && { sortBy: sort.sortBy }),
        ...(sort?.sortOrder && { sortOrder: sort.sortOrder }),
        ...(pagination.search && { search: pagination.search }),
    };

    return useQuery<PaginatedResult<SubmitQueryListRow>>({
        queryKey: submitQueryKey.list({
            page: pagination.page,
            limit: pagination.limit,
            search: pagination.search ?? undefined,
            sortBy: sort?.sortBy,
            sortOrder: sort?.sortOrder,
        }),
        queryFn: () => submitQueryService.getAll(params),
        placeholderData: (previousData) => {
            if (previousData && typeof previousData === 'object' && 'data' in previousData && 'meta' in previousData) {
                return previousData;
            }
            return undefined;
        },
    });
};

export const useSubmitQuerysAll = () => {
    return useQuery<PaginatedResult<SubmitQueryListRow>>({
        queryKey: submitQueryKey.list({ all: true }),
        queryFn: () => submitQueryService.getAll(),
    });
};

export const useSubmitQuery = (id: number | null) => {
    return useQuery<SubmitQueryListRow>({
        queryKey: submitQueryKey.detail(id ?? 0),
        queryFn: () => submitQueryService.getById(id!),
        enabled: !!id,
    });
};

export const useCreateSubmitQuery = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (data: CreateSubmitQueryDto) => submitQueryService.create(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: submitQueryKey.lists() });
            toast.success('Submit Query created successfully');
        },
        onError: (error) => {
            toast.error(handleQueryError(error));
        },
    });
};

export const useUpdateSubmitQuery = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ id, data }: { id: number; data: Omit<UpdateSubmitQueryDto, 'id'> }) =>
            submitQueryService.update(id, data),
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: submitQueryKey.lists() });
            queryClient.invalidateQueries({ queryKey: submitQueryKey.detail(data.id) });
            toast.success('Submit Query updated successfully');
        },
        onError: (error) => {
            toast.error(handleQueryError(error));
        },
    });
};

export const useDeleteSubmitQuery = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (id: number) => submitQueryService.remove(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: submitQueryKey.lists() });
            toast.success('Submit Query deleted successfully');
        },
        onError: (error) => {
            toast.error(handleQueryError(error));
        },
    });
};
