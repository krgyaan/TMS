import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { documentChecklistService } from '@/services/api/document-checklist.service';
import { toast } from 'sonner';
import type { DocumentChecklistsDashboardCounts, PaginatedResult, TenderDocumentChecklistDashboardRow, CreateDocumentChecklistDto, UpdateDocumentChecklistDto } from '@/types/api.types';

export const documentChecklistKeys = {
    all: ['documentChecklists'] as const,
    lists: () => [...documentChecklistKeys.all, 'list'] as const,
    detail: (id: number) => [...documentChecklistKeys.all, 'detail', id] as const,
    byTender: (tenderId: number) => [...documentChecklistKeys.all, 'byTender', tenderId] as const,
    list: (filters?: Record<string, unknown>) => [...documentChecklistKeys.lists(), { filters }] as const,
    dashboardCounts: () => [...documentChecklistKeys.all, 'dashboardCounts'] as const,
};

export const useDocumentChecklists = (
    tab?: 'pending' | 'submitted' | 'tender-dnb',
    pagination: { page: number; limit: number } = { page: 1, limit: 50 },
    sort?: { sortBy?: string; sortOrder?: 'asc' | 'desc' }
) => {
    const params = {
        ...(tab && { tab }),
        page: pagination.page,
        limit: pagination.limit,
        ...(sort?.sortBy && { sortBy: sort.sortBy }),
        ...(sort?.sortOrder && { sortOrder: sort.sortOrder }),
    };

    const queryKeyFilters = {
        tab,
        ...pagination,
        ...sort,
    };

    return useQuery<PaginatedResult<TenderDocumentChecklistDashboardRow>>({
        queryKey: documentChecklistKeys.list(queryKeyFilters),
        queryFn: () => documentChecklistService.getAll(params),
        placeholderData: (previousData) => {
            if (previousData && typeof previousData === 'object' && 'data' in previousData && 'meta' in previousData) {
                return previousData;
            }
            return undefined;
        },
    });
};

export const useDocumentChecklistByTender = (tenderId: number) => {
    return useQuery({
        queryKey: documentChecklistKeys.byTender(tenderId),
        queryFn: () => documentChecklistService.getByTenderId(tenderId),
        enabled: !!tenderId,
    });
};

export const useCreateDocumentChecklist = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (data: CreateDocumentChecklistDto) => documentChecklistService.create(data),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: documentChecklistKeys.all });
            queryClient.invalidateQueries({ queryKey: documentChecklistKeys.byTender(variables.tenderId) });
            queryClient.invalidateQueries({ queryKey: documentChecklistKeys.dashboardCounts() });
            toast.success('Document checklist submitted successfully');
        },
        onError: (error: any) => {
            toast.error(error?.response?.data?.message || 'Failed to submit document checklist');
        },
    });
};

export const useUpdateDocumentChecklist = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (data: UpdateDocumentChecklistDto) => documentChecklistService.update(data),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: documentChecklistKeys.all });
            queryClient.invalidateQueries({ queryKey: documentChecklistKeys.byTender(variables.tenderId) });
            queryClient.invalidateQueries({ queryKey: documentChecklistKeys.dashboardCounts() });
            toast.success('Document checklist updated successfully');
        },
        onError: (error: any) => {
            toast.error(error?.response?.data?.message || 'Failed to update document checklist');
        },
    });
};


export const useChecklistDashboardCounts = () => {
    return useQuery<DocumentChecklistsDashboardCounts>({
        queryKey: documentChecklistKeys.dashboardCounts(),
        queryFn: () => documentChecklistService.getDashboardCounts(),
        staleTime: 30000, // Cache for 30 seconds
    });
};
