import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { handleQueryError } from '@/lib/react-query';
import { submitQueryService } from '@/services/api/submit-query.service';
import type { PaginatedResult } from '@/types/api.types';
import type { CreateSubmitQueryPayload, SubmitQueryListParams, SubmitQueryListRow, SubmitQueryResponse, UpdateSubmitQueryPayload } from '@/modules/tendering/submit-queries/helpers/submitQueries.types';

export const submitQueryKeys = {
    all: ['submit-queries'] as const,
    lists: () => [...submitQueryKeys.all, 'list'] as const,
    list: (params?: SubmitQueryListParams) => [...submitQueryKeys.lists(), params] as const,
    details: () => [...submitQueryKeys.all, 'detail'] as const,
    detail: (id: number) => [...submitQueryKeys.details(), id] as const,
};

export interface UseSubmitQueriesParams {
    page?: number;
    limit?: number;
    search?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
}

// ============================================================================
// Query Hooks
// ============================================================================

/**
 * Fetch paginated list of submit queries
 */
export function useSubmitQueries(params: UseSubmitQueriesParams = {}) {
    const { page = 1, limit = 50, search, sortBy, sortOrder } = params;

    const queryParams: SubmitQueryListParams = {
        page,
        limit,
        ...(search && { search }),
        ...(sortBy && { sortBy }),
        ...(sortOrder && { sortOrder }),
    };

    return useQuery<PaginatedResult<SubmitQueryListRow>>({
        queryKey: submitQueryKeys.list(queryParams),
        queryFn: () => submitQueryService.getAll(queryParams),
        placeholderData: (prev) => prev,
    });
}

/**
 * Fetch all submit queries (no pagination)
 */
export function useSubmitQueriesAll() {
    return useQuery<PaginatedResult<SubmitQueryListRow>>({
        queryKey: submitQueryKeys.list(),
        queryFn: () => submitQueryService.getAll({ limit: 1000 }),
    });
}

/**
 * Fetch single submit query by ID
 */
export function useSubmitQuery(id: number | null | undefined) {
    return useQuery<SubmitQueryResponse>({
        queryKey: submitQueryKeys.detail(id ?? 0),
        queryFn: () => submitQueryService.getById(id!),
        enabled: !!id && id > 0,
    });
}

// ============================================================================
// Mutation Hooks
// ============================================================================

/**
 * Create a new submit query
 */
export function useCreateSubmitQuery() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (data: CreateSubmitQueryPayload) => submitQueryService.create(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: submitQueryKeys.lists() });
            toast.success('Submit query created successfully');
        },
        onError: (error) => {
            toast.error(handleQueryError(error));
        },
    });
}

/**
 * Update an existing submit query
 */
export function useUpdateSubmitQuery() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ id, data }: { id: number; data: UpdateSubmitQueryPayload }) =>
            submitQueryService.update(id, data),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: submitQueryKeys.lists() });
            queryClient.invalidateQueries({ queryKey: submitQueryKeys.detail(variables.id) });
            toast.success('Submit query updated successfully');
        },
        onError: (error) => {
            toast.error(handleQueryError(error));
        },
    });
}

/**
 * Delete a submit query
 */
export function useDeleteSubmitQuery() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (id: number) => submitQueryService.remove(id),
        onSuccess: (_, id) => {
            queryClient.invalidateQueries({ queryKey: submitQueryKeys.lists() });
            queryClient.removeQueries({ queryKey: submitQueryKeys.detail(id) });
            toast.success('Submit query deleted successfully');
        },
        onError: (error) => {
            toast.error(handleQueryError(error));
        },
    });
}
