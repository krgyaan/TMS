import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { enquiryCostingService } from '@/services/api/enquirycosting.service';
import { toast } from 'sonner';
import { showErrorToast } from '@/utils/errorToast';
import type { EnquiryCosting, EnquiryCostingListParams, SubmitCostingSheetRequest } from '@/modules/crm/enquirycosting/helpers/enquirycosting.type';
import type { PaginatedResult } from '@/types/api.types';

export const enquiryCostingKey = {
    all: ['enquiry-costings'] as const,
    lists: () => [...enquiryCostingKey.all, 'list'] as const,
    list: (filters?: Record<string, unknown>) => [...enquiryCostingKey.lists(), { filters }] as const,
    details: () => [...enquiryCostingKey.all, 'detail'] as const,
    detail: (id: number) => [...enquiryCostingKey.details(), id] as const,
};

type CostingPaginationParams = { page: number; limit: number; search?: string; status?: string };

export const useEnquiryCostings = (
    pagination: CostingPaginationParams = { page: 1, limit: 50 },
    sort?: { sortBy?: string; sortOrder?: 'asc' | 'desc' },
) => {
    const filters: EnquiryCostingListParams = {
        page: pagination.page,
        limit: pagination.limit,
        search: pagination.search,
        status: pagination.status,
        ...(sort?.sortBy && { sortBy: sort.sortBy }),
        ...(sort?.sortOrder && { sortOrder: sort.sortOrder }),
    };

    return useQuery<PaginatedResult<EnquiryCosting>>({
        queryKey: enquiryCostingKey.list({ ...pagination, ...sort }),
        queryFn: () => enquiryCostingService.getAll(filters),
        placeholderData: (prev) => {
            if (prev && typeof prev === 'object' && 'data' in prev && 'meta' in prev) return prev;
            return undefined;
        },
    });
};

export const useEnquiryCosting = (id: number | null) => {
    return useQuery({
        queryKey: id ? enquiryCostingKey.detail(id) : enquiryCostingKey.detail(0),
        queryFn: () => enquiryCostingService.getById(id!),
        enabled: !!id,
    });
};

export const useSubmitCostingSheet = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (data: SubmitCostingSheetRequest) => enquiryCostingService.submitCostingSheet(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: enquiryCostingKey.lists() });
            toast.success('Costing sheet submitted successfully');
        },
        onError: showErrorToast,
    });
};
