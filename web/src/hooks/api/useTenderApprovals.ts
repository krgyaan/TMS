import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { tenderApprovalsService } from '@/services/api/tender-approvals.service';
import { handleQueryError } from '@/lib/react-query';
import { toast } from 'sonner';
import type { SaveTenderApprovalDto } from '@/types/api.types';

export const tenderApprovalsKey = {
    all: ['tender-approvals'] as const,
    details: () => [...tenderApprovalsKey.all, 'detail'] as const,
    detail: (tenderId: number) => [...tenderApprovalsKey.details(), tenderId] as const,
};

export const useAllTenders = () => {
    return useQuery({
        queryKey: tenderApprovalsKey.all,
        queryFn: () => tenderApprovalsService.getAll(),
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
