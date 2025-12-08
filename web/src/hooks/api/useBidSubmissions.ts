import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { bidSubmissionsService, type BidSubmissionDashboardRow } from '@/services/api/bid-submissions.service';
import { toast } from 'sonner';

export const bidSubmissionsKey = {
    all: ['bid-submissions'] as const,
    lists: () => [...bidSubmissionsKey.all, 'list'] as const,
    detail: (id: number) => [...bidSubmissionsKey.all, 'detail', id] as const,
    byTender: (tenderId: number) => [...bidSubmissionsKey.all, 'byTender', tenderId] as const,
};

export const useBidSubmissions = () => {
    return useQuery({
        queryKey: bidSubmissionsKey.lists(),
        queryFn: () => bidSubmissionsService.getAll(),
    });
};

export const useBidSubmissionById = (id: number) => {
    return useQuery({
        queryKey: bidSubmissionsKey.detail(id),
        queryFn: () => bidSubmissionsService.getById(id),
        enabled: !!id,
    });
};

export const useBidSubmissionByTender = (tenderId: number) => {
    return useQuery({
        queryKey: bidSubmissionsKey.byTender(tenderId),
        queryFn: () => bidSubmissionsService.getByTenderId(tenderId),
        enabled: !!tenderId,
    });
};

export const useSubmitBid = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: bidSubmissionsService.submitBid,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: bidSubmissionsKey.all });
            toast.success('Bid submitted successfully');
        },
        onError: (error: any) => {
            toast.error(error?.response?.data?.message || 'Failed to submit bid');
        },
    });
};

export const useMarkAsMissed = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: bidSubmissionsService.markAsMissed,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: bidSubmissionsKey.all });
            toast.success('Tender marked as missed');
        },
        onError: (error: any) => {
            toast.error(error?.response?.data?.message || 'Failed to mark as missed');
        },
    });
};

export const useUpdateBidSubmission = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ id, data }: { id: number; data: any }) =>
            bidSubmissionsService.update(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: bidSubmissionsKey.all });
            toast.success('Bid submission updated successfully');
        },
        onError: (error: any) => {
            toast.error(error?.response?.data?.message || 'Failed to update bid submission');
        },
    });
};

export type { BidSubmissionDashboardRow };
