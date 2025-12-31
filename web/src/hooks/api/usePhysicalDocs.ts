import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { PhysicalDocsDashboardRow, PaginatedResult, CreatePhysicalDocsDto, UpdatePhysicalDocsDto, PhysicalDocsDashboardCounts } from '@/types/api.types'
import { handleQueryError } from '@/lib/react-query'
import { toast } from 'sonner'
import { physicalDocsService } from '@/services/api/physical-docs.service'

export const physicalDocsKey = {
    all: ['physical-docs'] as const,
    lists: () => [...physicalDocsKey.all, 'list'] as const,
    list: (filters?: Record<string, unknown>) => [...physicalDocsKey.lists(), { filters }] as const,
    details: () => [...physicalDocsKey.all, 'detail'] as const,
    detail: (id: number) => [...physicalDocsKey.details(), id] as const,
    byTender: (tenderId: number) => [...physicalDocsKey.all, "by-tender", tenderId] as const,
    dashboardCounts: () => [...physicalDocsKey.all, 'dashboard-counts'] as const,
};

export const usePhysicalDocs = (
    tab?: 'pending' | 'sent' | 'tender-dnb',
    pagination: { page: number; limit: number } = { page: 1, limit: 50 },
    sort?: { sortBy?: string; sortOrder?: 'asc' | 'desc' },
    search?: string
) => {
    return useQuery<PaginatedResult<PhysicalDocsDashboardRow>>({
        queryKey: physicalDocsKey.list({ tab, ...pagination, ...sort, search }),
        queryFn: () => physicalDocsService.getDashboard(tab, {
            page: pagination.page,
            limit: pagination.limit,
            sortBy: sort?.sortBy,
            sortOrder: sort?.sortOrder,
            search,
        }),
        placeholderData: (previousData) => {
            if (previousData && typeof previousData === 'object' && 'data' in previousData && 'meta' in previousData) {
                return previousData;
            }
            return undefined;
        },
    })
};

export const usePhysicalDoc = (id: number | null) => {
    return useQuery({
        queryKey: physicalDocsKey.detail(id ?? 0),
        queryFn: () => physicalDocsService.getById(id ?? 0),
        enabled: !!id,
    });
};

export const usePhysicalDocByTenderId = (tenderId: number | null) => {
    return useQuery({
        queryKey: physicalDocsKey.byTender(tenderId ?? 0),
        queryFn: async () => {
            try {
                return await physicalDocsService.getByTenderId(tenderId ?? 0);
            } catch (error: any) {
                // Handle 404 gracefully - return null if resource doesn't exist
                if (error?.response?.status === 404) {
                    return null;
                }
                throw error;
            }
        },
        enabled: !!tenderId,
    });
};

export const useCreatePhysicalDoc = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (data: CreatePhysicalDocsDto) => physicalDocsService.create(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: physicalDocsKey.lists() });
            queryClient.invalidateQueries({ queryKey: physicalDocsKey.dashboardCounts() });
            toast.success("Physical doc created successfully");
        },
        onError: error => {
            toast.error(handleQueryError(error));
        },
    });
};

export const useUpdatePhysicalDoc = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (data: UpdatePhysicalDocsDto) => physicalDocsService.update(data.id, data),
        onSuccess: data => {
            queryClient.invalidateQueries({ queryKey: physicalDocsKey.lists() });
            queryClient.invalidateQueries({ queryKey: physicalDocsKey.detail(data.id) });
            queryClient.invalidateQueries({ queryKey: physicalDocsKey.dashboardCounts() });
            toast.success("Physical doc updated successfully");
        },
        onError: error => {
            toast.error(handleQueryError(error));
        },
    });
};

export const usePhysicalDocsDashboardCounts = () => {
    return useQuery<PhysicalDocsDashboardCounts>({
        queryKey: physicalDocsKey.dashboardCounts(),
        queryFn: () => physicalDocsService.getDashboardCounts(),
        staleTime: 30000, // Cache for 30 seconds
    });
};
