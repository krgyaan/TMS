import { useRef, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { documentChecklistService } from '@/services/api/document-checklist.service';
import { toast } from 'sonner';
import { saveAs } from 'file-saver';
import type { DocumentChecklistsDashboardCounts, PaginatedResult, TenderDocumentChecklistDashboardRow, CreateDocumentChecklistDto, UpdateDocumentChecklistDto } from '@/types/api.types';
import { useTeamFilter } from '@/hooks/useTeamFilter';

export const documentChecklistKeys = {
    all: ['documentChecklists'] as const,
    lists: () => [...documentChecklistKeys.all, 'list'] as const,
    detail: (id: number) => [...documentChecklistKeys.all, 'detail', id] as const,
    byTender: (tenderId: number) => [...documentChecklistKeys.all, 'byTender', tenderId] as const,
    biddingRequirements: (tenderId: number) => [...documentChecklistKeys.all, 'biddingRequirements', tenderId] as const,
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
    const teamIdParam = teamId !== null ? teamId : undefined;

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

/**
 * Page-load, cache-only read of a tender's bidding-requirements analysis. Hits the
 * `/cached` endpoint, which never runs VolksAI, so opening the page costs nothing and a
 * completed analysis shows immediately. `null` = the tender has never been analysed.
 */
export const useCachedBiddingRequirements = (tenderId: number) => {
    return useQuery({
        queryKey: documentChecklistKeys.biddingRequirements(tenderId),
        queryFn: () => documentChecklistService.getCachedRequirements(tenderId),
        enabled: !!tenderId,
        staleTime: Infinity,
        refetchOnWindowFocus: false,
        retry: false,
    });
};

/**
 * On-demand AI analysis (VolksAI) of a tender's main + ATC documents for
 * suggested bidding requirements. A mutation, not a query: this is a slow,
 * costed LLM call that should run only when the user asks for it, never
 * automatically on mount or refetch. `forceRefresh` = "Re-analyze" (bypass the cache).
 * The result is written into the cached-read query so the page shows it from then on.
 */
export const useSuggestedBiddingRequirements = () => {
    const queryClient = useQueryClient();
    const abortControllerRef = useRef<AbortController | null>(null);

    useEffect(() => {
        return () => {
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
            }
        };
    }, []);

    return useMutation({
        mutationFn: ({ tenderId, forceRefresh = false }: { tenderId: number; forceRefresh?: boolean }) => {
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
            }
            const controller = new AbortController();
            abortControllerRef.current = controller;
            return documentChecklistService.getSuggestedRequirements(tenderId, forceRefresh, {
                signal: controller.signal,
                pollIntervalMs: 2000,
                maxWaitMs: 300_000,
            });
        },
        retry: false,
        onSuccess: (data, { tenderId }) => {
            queryClient.setQueryData(documentChecklistKeys.biddingRequirements(tenderId), data);
        },
        onError: (error: any) => {
            if (error?.name === 'AbortError') return;
            const data = error?.response?.data;
            let message = data?.message || error?.message || 'Failed to analyze bidding requirements for this tender';
            if (message === 'Internal server error' && data?.code) {
                message = `Analysis failed: ${data.code}`;
            }
            toast.error(message);
        },
    });
};

/** Downloads one annexure's .docx and hands it to the browser (file-saver, as the xlsx exports do). */
export const useDownloadAnnexure = () => {
    return useMutation({
        mutationFn: async ({ tenderId, annexureIndex }: { tenderId: number; annexureIndex: number }) => {
            const { blob, filename } = await documentChecklistService.downloadAnnexure(tenderId, annexureIndex);
            saveAs(blob, filename);
        },
        onError: () => {
            toast.error('Failed to download annexure');
        },
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
    const teamIdParam = teamId !== null ? teamId : undefined;
    
    // Include all filter context in query key to ensure proper cache invalidation
    // Use explicit values (including null) so React Query can properly differentiate cache entries
    const queryKey = [...documentChecklistKeys.dashboardCounts(), dataScope, teamId ?? null, userId ?? null];
    
    return useQuery<DocumentChecklistsDashboardCounts>({
        queryKey,
        queryFn: () => documentChecklistService.getDashboardCounts(teamIdParam),
        staleTime: 0, // Always refetch when query key changes to ensure counts are up-to-date
    });
};
