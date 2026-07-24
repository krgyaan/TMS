import type { CreatePartyDTO, CreatePurchaseOrderDTO, SetTdsDTO, UpdatePurchaseOrderDTO } from "@/modules/operations/purchase-orders/helpers/purchaseOrder.types";
import { purchaseOrderApi } from "@/services/api/purchase-order.api";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export const purchaseOrderKeys = {
    all: ["purchase-orders"] as const,
    poParties: () => [...purchaseOrderKeys.all, "po-parties"] as const,
    purchaseOrder: (id: number) => [...purchaseOrderKeys.all, "purchase-order", id] as const,
    projectPurchaseOrders: (projectId: number) => [...purchaseOrderKeys.all, "project", projectId] as const,
};

export const useProjectPurchaseOrders = (projectId: number) => {
    return useQuery({
        queryKey: purchaseOrderKeys.projectPurchaseOrders(projectId),
        queryFn: () => purchaseOrderApi.getProjectPurchaseOrders(projectId),
        enabled: !!projectId,
    });
};

export const usePoParties = () => {
    return useQuery({
        queryKey: purchaseOrderKeys.poParties(),
        queryFn: () => purchaseOrderApi.getPoParties(),
        staleTime: 5 * 60 * 1000,
    });
};

export const useNextPONumber = (projectName: string | undefined) => {
    return useQuery({
        queryKey: [...purchaseOrderKeys.all, "next-po-number", projectName],
        queryFn: () => purchaseOrderApi.getNextPONumber(projectName!),
        enabled: !!projectName,
        staleTime: 5 * 60 * 1000,
    });
};

export const useAllPurchaseOrders = (teamId?: number, status?: string) => {
    return useQuery({
        queryKey: [...purchaseOrderKeys.all, "all", teamId, status],
        queryFn: () => purchaseOrderApi.getAllPurchaseOrders(teamId, status),
        placeholderData: (previousData) => previousData,
    });
};

export const usePurchaseOrderApprovalCounts = (teamId?: number) => {
    return useQuery({
        queryKey: [...purchaseOrderKeys.all, "approval-counts", teamId],
        queryFn: () => purchaseOrderApi.getApprovalCounts(teamId),
        staleTime: 30 * 1000,
    });
};

export const usePurchaseOrderDetails = (id: number) => {
    return useQuery({
        queryKey: purchaseOrderKeys.purchaseOrder(id),
        queryFn: () => purchaseOrderApi.getPurchaseOrder(id),
        enabled: !!id,
    });
};

export const useCreatePurchaseOrder = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (data: CreatePurchaseOrderDTO) => purchaseOrderApi.createPurchaseOrder(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: purchaseOrderKeys.all });
        },
    });
};

export const useUpdatePurchaseOrder = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, data }: { id: number; data: UpdatePurchaseOrderDTO }) =>
            purchaseOrderApi.updatePurchaseOrder(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: purchaseOrderKeys.all });
        },
    });
};

export const useSetTdsPercentage = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, data }: { id: number; data: SetTdsDTO }) =>
            purchaseOrderApi.setTdsPercentage(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: purchaseOrderKeys.all });
        },
    });
};

export const useCreatePoParty = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (data: CreatePartyDTO) => purchaseOrderApi.createParty(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: purchaseOrderKeys.poParties() });
        },
    });
};
