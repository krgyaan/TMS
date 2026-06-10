import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { paymentRequestApi } from "@/services/api/payment-request.api";

export function useAllPaymentRequests() {
    return useQuery({
        queryKey: ["payment-requests", "all"],
        queryFn: () => paymentRequestApi.getAll(),
    });
}

export function usePaymentRequestDetails(id: number) {
    return useQuery({
        queryKey: ["payment-requests", id],
        queryFn: () => paymentRequestApi.getById(id),
        enabled: !!id,
    });
}

export function useProjectPaymentRequests(projectId: number) {
    return useQuery({
        queryKey: ["payment-requests", "project", projectId],
        queryFn: () => paymentRequestApi.getByProject(projectId),
        enabled: !!projectId,
    });
}

export function useNextPRNumber(projectName?: string) {
    return useQuery({
        queryKey: ["payment-requests", "next-number", projectName],
        queryFn: () => paymentRequestApi.getNextNumber(projectName),
        enabled: !!projectName,
    });
}

export function useCreatePaymentRequest() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (data: any) => paymentRequestApi.create(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["payment-requests"] });
        },
    });
}

export function useUpdatePaymentRequest() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, data }: { id: number; data: any }) =>
            paymentRequestApi.update(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["payment-requests"] });
        },
    });
}
