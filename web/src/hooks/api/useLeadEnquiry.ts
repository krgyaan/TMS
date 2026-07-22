import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { leadEnquiryService } from '@/services/api/lead-enquiry.service';
import { toast } from 'sonner';
import { showErrorToast } from '@/utils/errorToast';
import type { CreateLeadEnquiryRequest, UpdateLeadEnquiryRequest, LeadEnquiryListParams, LeadEnquiryWithNames } from '@/modules/crm/lead-enquiry/helpers/lead-enquiry.type';
import type { PaginatedResult } from '@/types/api.types';

export const leadEnquiryKey = {
    all: ['lead-enquiries'] as const,
    lists: () => [...leadEnquiryKey.all, 'list'] as const,
    list: (filters?: Record<string, unknown>) => [...leadEnquiryKey.lists(), { filters }] as const,
    details: () => [...leadEnquiryKey.all, 'detail'] as const,
    detail: (id: number) => [...leadEnquiryKey.details(), id] as const,
};

type EnquiryPaginationParams = { page: number; limit: number; search?: string; status?: string; };

export const useLeadEnquiries = (
    pagination: EnquiryPaginationParams = { page: 1, limit: 50 },
    sort?: { sortBy?: string; sortOrder?: 'asc' | 'desc' },
) => {
    const filters: LeadEnquiryListParams = {
        page: pagination.page,
        limit: pagination.limit,
        search: pagination.search,
        status: pagination.status,
        ...(sort?.sortBy && { sortBy: sort.sortBy }),
        ...(sort?.sortOrder && { sortOrder: sort.sortOrder }),
    };

    return useQuery<PaginatedResult<LeadEnquiryWithNames>>({
        queryKey: leadEnquiryKey.list({ ...pagination, ...sort }),
        queryFn: () => leadEnquiryService.getAll(filters),
        placeholderData: (prev) => {
            if (prev && typeof prev === 'object' && 'data' in prev && 'meta' in prev) return prev;
            return undefined;
        },
    });
};

export const useLeadEnquiry = (id: number | null) => {
    return useQuery({
        queryKey: id ? leadEnquiryKey.detail(id) : leadEnquiryKey.detail(0),
        queryFn: () => leadEnquiryService.getById(id!),
        enabled: !!id,
    });
};

export const useCreateLeadEnquiry = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (data: CreateLeadEnquiryRequest) => leadEnquiryService.create(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: leadEnquiryKey.lists() });
            toast.success('Enquiry created successfully');
        },
        onError: showErrorToast,
    });
};

export const useUpdateLeadEnquiry = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, data }: { id: number; data: UpdateLeadEnquiryRequest }) => leadEnquiryService.update(id, data),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: leadEnquiryKey.lists() });
            queryClient.invalidateQueries({ queryKey: leadEnquiryKey.detail(variables.id) });
            toast.success('Enquiry updated successfully');
        },
        onError: showErrorToast,
    });
};

export const useDeleteLeadEnquiry = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id: number) => leadEnquiryService.remove(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: leadEnquiryKey.lists() });
            toast.success('Enquiry deleted successfully');
        },
        onError: showErrorToast,
    });
};
