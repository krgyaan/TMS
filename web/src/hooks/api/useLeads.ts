import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { leadsService } from '@/services/api/leads.service';
import { toast } from 'sonner';
import { showErrorToast } from '@/utils/errorToast';
import type { 
    CreateLeadRequest, 
    UpdateLeadRequest,
    AllocateLeadRequest,
    LeadListParams,
    LeadWithNames
} from '@/modules/crm/leads/helpers/leads.type';
import type { PaginatedResult } from '@/types/api.types';

export const leadsKey = {
    all: ['leads'] as const,
    lists: () => [...leadsKey.all, 'list'] as const,
    list: (filters?: Record<string, unknown>) => [...leadsKey.lists(), { filters }] as const,
    details: () => [...leadsKey.all, 'detail'] as const,
    detail: (id: number) => [...leadsKey.details(), id] as const,
};

type LeadsPaginationParams = {
    page: number;
    limit: number;
    search?: string;
    priority?: string;
    status?: string;    // ← NEW
};

export const useLeads = (
    pagination: LeadsPaginationParams = { page: 1, limit: 50 },
    sort?: { sortBy?: string; sortOrder?: 'asc' | 'desc' }
) => {
    const filters: LeadListParams = {
        page: pagination.page,
        limit: pagination.limit,
        search: pagination.search,
        priority: pagination.priority,
        status: pagination.status,      // ← NEW
        ...(sort?.sortBy    && { sortBy: sort.sortBy }),
        ...(sort?.sortOrder && { sortOrder: sort.sortOrder }),
    };

    return useQuery<PaginatedResult<LeadWithNames>>({
        queryKey: leadsKey.list({ ...pagination, ...sort }),
        queryFn: () => leadsService.getAll(filters),
        placeholderData: (prev) => {
            if (prev && typeof prev === 'object' && 'data' in prev && 'meta' in prev) return prev;
            return undefined;
        },
    });
};

export const useLead = (id: number | null) => {
    return useQuery({
        queryKey: id ? leadsKey.detail(id) : leadsKey.detail(0),
        queryFn: () => leadsService.getById(id!),
        enabled: !!id,
    });
};

export const useCreateLead = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (data: CreateLeadRequest) => leadsService.create(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: leadsKey.lists() });
            toast.success('Lead created successfully');
        },
        onError: showErrorToast,
    });
};

export const useUpdateLead = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, data }: { id: number; data: UpdateLeadRequest }) =>
            leadsService.update(id, data),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: leadsKey.lists() });
            queryClient.invalidateQueries({ queryKey: leadsKey.detail(variables.id) });
            toast.success('Lead updated successfully');
        },
        onError: showErrorToast,
    });
};

export const useAllocateLead = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, data }: { id: number; data: AllocateLeadRequest }) =>
            leadsService.allocate(id, data),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: leadsKey.lists() });
            queryClient.invalidateQueries({ queryKey: leadsKey.detail(variables.id) });
            toast.success('Lead allocated successfully');
        },
        onError: showErrorToast,
    });
};

export const useDeleteLead = () => {
    const queryClient = useQueryClient();
    return useMutation({
        // ← UPDATED: accepts reason
        mutationFn: ({ id, reason }: { id: number; reason?: string }) =>
            leadsService.remove(id, reason),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: leadsKey.lists() });
            toast.success('Lead disqualified successfully');
        },
        onError: showErrorToast,
    });
};