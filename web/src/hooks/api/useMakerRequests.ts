import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { makerRequestApi } from "@/services/api/maker-request.api";

export function useMakerRequests() {
    return useQuery({
        queryKey: ["maker-requests", "all"],
        queryFn: () => makerRequestApi.getAll(),
    });
}

export function useMyMakerRequests() {
    return useQuery({
        queryKey: ["maker-requests", "my"],
        queryFn: () => makerRequestApi.getMyRequests(),
    });
}

export function useMakerRequestDetails(id: number) {
    return useQuery({
        queryKey: ["maker-requests", id],
        queryFn: () => makerRequestApi.getById(id),
        enabled: !!id,
    });
}

export function useCreateMakerRequest() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (data: any) => makerRequestApi.create(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["maker-requests"] });
        },
    });
}

export function useUpdateMakerRequestStatus() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, data }: { id: number; data: { status: string; utrNumber?: string; rejectionReason?: string } }) =>
            makerRequestApi.updateStatus(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["maker-requests"] });
        },
    });
}
