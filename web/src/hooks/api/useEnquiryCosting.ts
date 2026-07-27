import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { enquiryCostingService } from '@/services/api/enquirycosting.service';
import { toast } from 'sonner';
import { showErrorToast } from '@/utils/errorToast';
import type { EnquiryCosting, EnquiryCostingListParams, SubmitCostingSheetRequest, ResubmitCostingSheetRequest, ApproveCostingSheetRequest, RedoCostingSheetRequest, RejectEnquiryRequest } from '@/modules/crm/enquirycosting/helpers/enquirycosting.type';
import type { PaginatedResult } from '@/types/api.types';

export const enquiryCostingKey = {
    all: ['enquiry-costings'] as const,
    lists: () => [...enquiryCostingKey.all, 'list'] as const,
    list: (filters?: Record<string, unknown>) => [...enquiryCostingKey.lists(), { filters }] as const,
    details: () => [...enquiryCostingKey.all, 'detail'] as const,
    detail: (id: number) => [...enquiryCostingKey.details(), id] as const,
    byEnquiry: (enquiryId: number) => [...enquiryCostingKey.all, 'by-enquiry', enquiryId] as const,
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

export const useEnquiryCostingByEnquiry = (enquiryId: number | null) => {
    return useQuery({
        queryKey: enquiryId ? enquiryCostingKey.byEnquiry(enquiryId) : enquiryCostingKey.byEnquiry(0),
        queryFn: () => enquiryCostingService.getByEnquiryId(enquiryId!),
        enabled: !!enquiryId,
    });
};

export const useSubmitCostingSheet = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (data: SubmitCostingSheetRequest) => enquiryCostingService.submitCostingSheet(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: enquiryCostingKey.lists() });
            queryClient.invalidateQueries({ queryKey: ['lead-enquiries', 'list'] });
            toast.success('Costing sheet submitted successfully');
        },
        onError: showErrorToast,
    });
};

export const useResubmitCostingSheet = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (data: ResubmitCostingSheetRequest) => enquiryCostingService.resubmitCostingSheet(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: enquiryCostingKey.lists() });
            queryClient.invalidateQueries({ queryKey: ['lead-enquiries', 'list'] });
            toast.success('Costing sheet resubmitted successfully');
        },
        onError: showErrorToast,
    });
};

export const useApproveCosting = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, data }: { id: number; data: ApproveCostingSheetRequest }) => enquiryCostingService.approveCosting(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: enquiryCostingKey.lists() });
            toast.success('Costing sheet approved successfully');
        },
        onError: showErrorToast,
    });
};

export const useRedoCosting = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, data }: { id: number; data: RedoCostingSheetRequest }) => enquiryCostingService.redoCosting(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: enquiryCostingKey.lists() });
            queryClient.invalidateQueries({ queryKey: ['lead-enquiries', 'list'] });
            toast.success('Costing marked as Redo');
        },
        onError: showErrorToast,
    });
};

export const useRejectEnquiryFromCosting = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, data }: { id: number; data: RejectEnquiryRequest }) => enquiryCostingService.rejectEnquiry(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: enquiryCostingKey.lists() });
            queryClient.invalidateQueries({ queryKey: ['lead-enquiries', 'list'] });
            toast.success('Enquiry rejected successfully');
        },
        onError: showErrorToast,
    });
};
