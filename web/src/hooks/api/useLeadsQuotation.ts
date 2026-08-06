import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { leadsQuotationService } from '@/services/api/leads-quotation.service';
import { toast } from 'sonner';
import { showErrorToast } from '@/utils/errorToast';
import type { PrivateQuote, LeadsQuotationListParams, UpdatePrivateQuoteRequest } from '@/modules/crm/leads-quotation/helpers/leads-quotation.type';
import type { PaginatedResult } from '@/types/api.types';

export type { UpdatePrivateQuoteRequest, ContactEntry } from '@/modules/crm/leads-quotation/helpers/leads-quotation.type';

export const leadsQuotationKey = {
    all: ['leads-quotations'] as const,
    lists: () => [...leadsQuotationKey.all, 'list'] as const,
    list: (filters?: Record<string, unknown>) => [...leadsQuotationKey.lists(), { filters }] as const,
    details: () => [...leadsQuotationKey.all, 'detail'] as const,
    detail: (id: number) => [...leadsQuotationKey.details(), id] as const,
};

export const useLeadsQuotations = (
    pagination: LeadsQuotationListParams = { page: 1, limit: 50 },
    sort?: { sortBy?: string; sortOrder?: 'asc' | 'desc' },
) => {
    const filters: LeadsQuotationListParams = {
        page: pagination.page,
        limit: pagination.limit,
        search: pagination.search,
        status: pagination.status,
        enquiryId: pagination.enquiryId,
        ...(sort?.sortBy && { sortBy: sort.sortBy }),
        ...(sort?.sortOrder && { sortOrder: sort.sortOrder }),
    };

    return useQuery<PaginatedResult<PrivateQuote>>({
        queryKey: leadsQuotationKey.list({ ...pagination, ...sort }),
        queryFn: () => leadsQuotationService.getAll(filters),
        placeholderData: (prev) => {
            if (prev && typeof prev === 'object' && 'data' in prev && 'meta' in prev) return prev;
            return undefined;
        },
    });
};

export const useLeadsQuotation = (id: number | null) => {
    return useQuery({
        queryKey: id ? leadsQuotationKey.detail(id) : leadsQuotationKey.detail(0),
        queryFn: () => leadsQuotationService.getById(id!),
        enabled: !!id,
    });
};

export const useUpdateQuote = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, data }: { id: number; data: UpdatePrivateQuoteRequest }) =>
            leadsQuotationService.update(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: leadsQuotationKey.lists() });
            queryClient.invalidateQueries({ queryKey: leadsQuotationKey.details() });
            toast.success('Quote updated successfully');
        },
        onError: showErrorToast,
    });
};
