import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { vendorWorkOrderApi } from "@/services/api/vendor-work-order.api";
import type { CreateVendorWorkOrderDTO, UpdateVendorWorkOrderDTO } from "@/modules/operations/vendor-work-orders/helpers/vwoForm.types";

export function useAllVendorWorkOrders(teamId?: number) {
    return useQuery({
        queryKey: ["vendor-work-orders", "all", teamId],
        queryFn: () => vendorWorkOrderApi.getAll(teamId),
    });
}

export function useVendorWorkOrderDetails(id: number) {
    return useQuery({
        queryKey: ["vendor-work-orders", id],
        queryFn: () => vendorWorkOrderApi.getById(id),
        enabled: !!id,
    });
}

export function useProjectVendorWorkOrders(projectId: number) {
    return useQuery({
        queryKey: ["vendor-work-orders", "project", projectId],
        queryFn: () => vendorWorkOrderApi.getByProject(projectId),
        enabled: !!projectId,
    });
}

export function useNextVWONumber(projectName?: string) {
    return useQuery({
        queryKey: ["vendor-work-orders", "next-number", projectName],
        queryFn: () => vendorWorkOrderApi.getNextWONumber(projectName),
        enabled: !!projectName,
    });
}

export function useVendorWorkOrderParties() {
    return useQuery({
        queryKey: ["vendor-work-orders", "parties"],
        queryFn: () => vendorWorkOrderApi.getParties(),
    });
}

export function useCreateVendorWorkOrderParty() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (data: any) => vendorWorkOrderApi.createParty(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["vendor-work-orders", "parties"] });
        },
    });
}

export function useCreateVendorWorkOrder() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (data: CreateVendorWorkOrderDTO) => vendorWorkOrderApi.create(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["vendor-work-orders"] });
        },
    });
}

export function useUpdateVendorWorkOrder() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, data }: { id: number; data: UpdateVendorWorkOrderDTO }) =>
            vendorWorkOrderApi.update(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["vendor-work-orders"] });
        },
    });
}
