import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { emdsService } from '@/services/api';
import { handleQueryError } from '@/lib/react-query';
import { toast } from 'sonner';

export const paymentRequestsKey = {
    all: ['payment-requests'] as const,
    lists: () => [...paymentRequestsKey.all, 'list'] as const,
    list: (filters?: { status?: string }) => [...paymentRequestsKey.lists(), { filters }] as const,
    details: () => [...paymentRequestsKey.all, 'detail'] as const,
    detail: (id: number) => [...paymentRequestsKey.details(), id] as const,
    byTender: () => [...paymentRequestsKey.all, 'by-tender'] as const,
    byTenderId: (tenderId: number) => [...paymentRequestsKey.byTender(), tenderId] as const,
};

export const usePaymentRequests = (statusFilter?: string) => {
    return useQuery({
        queryKey: paymentRequestsKey.list({ status: statusFilter }),
        queryFn: () => emdsService.getAll({ status: statusFilter }),
    });
};

export const usePaymentRequestsByTender = (tenderId: number | null) => {
    return useQuery({
        queryKey: tenderId ? paymentRequestsKey.byTenderId(tenderId) : paymentRequestsKey.byTenderId(0),
        queryFn: () => emdsService.getByTenderId(tenderId!),
        enabled: !!tenderId,
    });
};

export const usePaymentRequest = (id: number | null) => {
    return useQuery({
        queryKey: id ? paymentRequestsKey.detail(id) : paymentRequestsKey.detail(0),
        queryFn: () => emdsService.getById(id!),
        enabled: !!id,
    });
};

export const useCreatePaymentRequest = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ tenderId, data }: { tenderId: number; data: any }) =>
            emdsService.create(tenderId, data),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: paymentRequestsKey.byTenderId(variables.tenderId) });
            queryClient.invalidateQueries({ queryKey: paymentRequestsKey.all });
            toast.success('Payment request(s) created successfully');
        },
        onError: (error) => {
            toast.error(handleQueryError(error));
        },
    });
};

export const useUpdatePaymentRequest = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ id, data }: { id: number; data: any }) =>
            emdsService.update(id, data),
        onSuccess: (data, variables) => {
            queryClient.invalidateQueries({ queryKey: paymentRequestsKey.detail(variables.id) });
            queryClient.invalidateQueries({ queryKey: paymentRequestsKey.all });
            // Also invalidate by tender if we have the tenderId
            if (data?.tenderId) {
                queryClient.invalidateQueries({ queryKey: paymentRequestsKey.byTenderId(data.tenderId) });
            }
            toast.success('Payment request updated successfully');
        },
        onError: (error) => {
            toast.error(handleQueryError(error));
        },
    });
};

export const useUpdatePaymentStatus = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ id, status, remarks }: { id: number; status: string; remarks?: string }) =>
            emdsService.updateStatus(id, { status, remarks }),
        onSuccess: (data, variables) => {
            queryClient.invalidateQueries({ queryKey: paymentRequestsKey.detail(variables.id) });
            queryClient.invalidateQueries({ queryKey: paymentRequestsKey.all });
            if (data?.tenderId) {
                queryClient.invalidateQueries({ queryKey: paymentRequestsKey.byTenderId(data.tenderId) });
            }
            toast.success('Payment request status updated successfully');
        },
        onError: (error) => {
            toast.error(handleQueryError(error));
        },
    });
};
