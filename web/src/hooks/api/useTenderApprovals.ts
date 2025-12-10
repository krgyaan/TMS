import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { tenderApprovalsService, type TenderApprovalFilters } from '@/services/api/tender-approvals.service';
import { handleQueryError } from '@/lib/react-query';
import { toast } from 'sonner';
import type { SaveTenderApprovalDto } from '@/types/api.types';

export const tenderApprovalsKey = {
    all: ['tender-approvals'] as const,
    lists: () => [...tenderApprovalsKey.all, 'list'] as const,
    list: (filters?: TenderApprovalFilters) => [...tenderApprovalsKey.lists(), { filters }] as const,
    details: () => [...tenderApprovalsKey.all, 'detail'] as const,
    detail: (tenderId: number) => [...tenderApprovalsKey.details(), tenderId] as const,
};

export const useAllTenders = (filters?: TenderApprovalFilters) => {
    return useQuery({
        queryKey: tenderApprovalsKey.list(filters),
        queryFn: () => tenderApprovalsService.getAll(filters),
    });
};

export const useTenderApproval = (tenderId: number | null) => {
    return useQuery({
        queryKey: tenderId ? tenderApprovalsKey.detail(tenderId) : tenderApprovalsKey.detail(0),
        queryFn: () => tenderApprovalsService.getByTenderId(tenderId!),
        enabled: !!tenderId,
    });
};

export const useCreateTenderApproval = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ tenderId, data }: { tenderId: number; data: SaveTenderApprovalDto }) =>
            tenderApprovalsService.create(tenderId, data),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: tenderApprovalsKey.detail(variables.tenderId) });
            queryClient.invalidateQueries({ queryKey: tenderApprovalsKey.all });
            toast.success('Tender approval submitted successfully');
        },
        onError: (error) => {
            toast.error(handleQueryError(error));
        },
    });
};

export const useUpdateTenderApproval = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ tenderId, data }: { tenderId: number; data: SaveTenderApprovalDto }) =>
            tenderApprovalsService.update(tenderId, data),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: tenderApprovalsKey.detail(variables.tenderId) });
            queryClient.invalidateQueries({ queryKey: tenderApprovalsKey.all });
            toast.success('Tender approval updated successfully');
        },
        onError: (error) => {
            toast.error(handleQueryError(error));
        },
    });
};
