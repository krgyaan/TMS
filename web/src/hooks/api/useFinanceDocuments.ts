import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { financeDocumentsService } from '@/services/api/finance-documents.service';
import type {
    FinanceDocumentListRow,
    FinanceDocumentListParams,
    CreateFinanceDocumentDto,
    UpdateFinanceDocumentDto,
} from '@/modules/shared/finance-document/helpers/financeDocument.types';
import type { PaginatedResult } from '@/types/api.types';
import { toast } from 'sonner';
import { handleQueryError } from '@/lib/react-query';

export const financeDocumentsKey = {
    all: ['finance-documents'] as const,
    lists: () => [...financeDocumentsKey.all, 'list'] as const,
    list: (filters?: Record<string, unknown>) => [...financeDocumentsKey.lists(), { filters }] as const,
    detail: (id: number) => [...financeDocumentsKey.all, 'detail', id] as const,
};

export const useFinanceDocuments = (
    pagination: { page: number; limit: number; search?: string } = { page: 1, limit: 50 },
    sort?: { sortBy?: string; sortOrder?: 'asc' | 'desc' }
) => {
    const params: FinanceDocumentListParams = {
        page: pagination.page,
        limit: pagination.limit,
        ...(sort?.sortBy && { sortBy: sort.sortBy }),
        ...(sort?.sortOrder && { sortOrder: sort.sortOrder }),
        ...(pagination.search && { search: pagination.search }),
    };

    return useQuery<PaginatedResult<FinanceDocumentListRow>>({
        queryKey: financeDocumentsKey.list({
            page: pagination.page,
            limit: pagination.limit,
            search: pagination.search ?? undefined,
            sortBy: sort?.sortBy,
            sortOrder: sort?.sortOrder,
        }),
        queryFn: () => financeDocumentsService.getAll(params),
        placeholderData: (previousData) => {
            if (previousData && typeof previousData === 'object' && 'data' in previousData && 'meta' in previousData) {
                return previousData;
            }
            return undefined;
        },
    });
};

export const useFinanceDocument = (id: number | null) => {
    return useQuery<FinanceDocumentListRow>({
        queryKey: financeDocumentsKey.detail(id ?? 0),
        queryFn: () => financeDocumentsService.getById(id!),
        enabled: !!id,
    });
};

export const useCreateFinanceDocument = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (data: CreateFinanceDocumentDto) => financeDocumentsService.create(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: financeDocumentsKey.lists() });
            toast.success('Finance document created successfully');
        },
        onError: (error) => {
            toast.error(handleQueryError(error));
        },
    });
};

export const useUpdateFinanceDocument = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ id, data }: { id: number; data: Omit<UpdateFinanceDocumentDto, 'id'> }) =>
            financeDocumentsService.update(id, data),
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: financeDocumentsKey.lists() });
            queryClient.invalidateQueries({ queryKey: financeDocumentsKey.detail(data.id) });
            toast.success('Finance document updated successfully');
        },
        onError: (error) => {
            toast.error(handleQueryError(error));
        },
    });
};

export const useDeleteFinanceDocument = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (id: number) => financeDocumentsService.remove(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: financeDocumentsKey.lists() });
            toast.success('Finance document deleted successfully');
        },
        onError: (error) => {
            toast.error(handleQueryError(error));
        },
    });
};
