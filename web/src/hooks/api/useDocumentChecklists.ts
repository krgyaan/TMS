import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { documentChecklistService } from '@/services/api/document-checklist.service';
import { toast } from 'sonner';
import type { DocumentChecklistsDashboardCounts, PaginatedResult, TenderDocumentChecklistDashboardRow, CreateDocumentChecklistDto, UpdateDocumentChecklistDto } from '@/types/api.types';
import { useTeamFilter } from '@/hooks/useTeamFilter';

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
    pagination: { page: number; limit: number; search?: string } = { page: 1, limit: 50 },
    sort?: { sortBy?: string; sortOrder?: 'asc' | 'desc' }
) => {
    const { teamId, userId, dataScope } = useTeamFilter();
    // Only pass teamId for Super User/Admin (dataScope === 'all') when a team is selected
    const teamIdParam = dataScope === 'all' && teamId !== null ? teamId : undefined;

    const params = {
        ...(tab && { tab }),
        page: pagination.page,
        limit: pagination.limit,
        ...(sort?.sortBy && { sortBy: sort.sortBy }),
        ...(sort?.sortOrder && { sortOrder: sort.sortOrder }),
        ...(pagination.search && { search: pagination.search }),
    };

    const queryKeyFilters = {
        tab,
        ...pagination,
        ...sort,
        dataScope,
        teamId: teamId ?? null,
        userId: userId ?? null,
    };

    return useQuery<PaginatedResult<TenderDocumentChecklistDashboardRow>>({
        queryKey: documentChecklistKeys.list(queryKeyFilters),
        queryFn: () => documentChecklistService.getAll(params, teamIdParam),
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
    const { teamId, userId, dataScope } = useTeamFilter();
    // Only pass teamId for Super User/Admin (dataScope === 'all') when a team is selected
    const teamIdParam = dataScope === 'all' && teamId !== null ? teamId : undefined;
    
    // Include all filter context in query key to ensure proper cache invalidation
    // Use explicit values (including null) so React Query can properly differentiate cache entries
    const queryKey = [...documentChecklistKeys.dashboardCounts(), dataScope, teamId ?? null, userId ?? null];
    
    return useQuery<DocumentChecklistsDashboardCounts>({
        queryKey,
        queryFn: () => documentChecklistService.getDashboardCounts(teamIdParam),
        staleTime: 0, // Always refetch when query key changes to ensure counts are up-to-date
    });
};
