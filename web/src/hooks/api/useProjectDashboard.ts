import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { projectDashboardApi } from "@/services/api/project-dashboard.api";
import type { CreatePurchaseOrderDTO, CreatePartyDTO, UpdatePurchaseOrderDTO } from "@/modules/operations/project-dashboard/helpers/projectDashboard.types";

export const projectsDashboardKeys = {
    all: ["projects-dashboard"] as const,
    lists: () => [...projectsDashboardKeys.all, "list"] as const,
    poParties: () => [...projectsDashboardKeys.all, "po-parties"] as const,
    purchaseOrder: (id: number) => [...projectsDashboardKeys.all, "purchase-order", id] as const,
    overview: (id: number) => [...projectsDashboardKeys.all, "overview", id] as const,
    workOrders: (id: number) => [...projectsDashboardKeys.all, "work-orders", id] as const,
    projectPurchaseOrders: (id: number) => [...projectsDashboardKeys.all, "purchase-orders", id] as const,
    imprests: (id: number) => [...projectsDashboardKeys.all, "imprests", id] as const,
};

// ── Individual parallel hooks ──

export const useProjectOverview = (id: number) => {
    return useQuery({
        queryKey: projectsDashboardKeys.overview(id),
        queryFn: () => projectDashboardApi.getOverview(id),
        enabled: !!id,
    });
};

export const useProjectWorkOrders = (id: number) => {
    return useQuery({
        queryKey: projectsDashboardKeys.workOrders(id),
        queryFn: () => projectDashboardApi.getWorkOrders(id),
        enabled: !!id,
    });
};

export const useProjectPurchaseOrders = (id: number) => {
    return useQuery({
        queryKey: projectsDashboardKeys.projectPurchaseOrders(id),
        queryFn: () => projectDashboardApi.getProjectPurchaseOrders(id),
        enabled: !!id,
    });
};

export const useProjectImprests = (id: number) => {
    return useQuery({
        queryKey: projectsDashboardKeys.imprests(id),
        queryFn: () => projectDashboardApi.getImprests(id),
        enabled: !!id,
    });
};



export const usePoParties = () => {
    return useQuery({
        queryKey: projectsDashboardKeys.poParties(),
        queryFn: () => projectDashboardApi.getPoParties(),
        staleTime: 5 * 60 * 1000,
    });
};

export const usePurchaseOrderDetails = (id: number) => {
    return useQuery({
        queryKey: projectsDashboardKeys.purchaseOrder(id),
        queryFn: () => projectDashboardApi.getPurchaseOrder(id),
        enabled: !!id,
    });
};

export const useCreatePurchaseOrder = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (data: CreatePurchaseOrderDTO) => projectDashboardApi.createPurchaseOrder(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: projectsDashboardKeys.all });
        },
    });
};

export const useUpdatePurchaseOrder = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ id, data }: { id: number; data: UpdatePurchaseOrderDTO }) =>
            projectDashboardApi.updatePurchaseOrder(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: projectsDashboardKeys.all });
        },
    });
};

export const useCreatePoParty = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (data: CreatePartyDTO) => projectDashboardApi.createParty(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: projectsDashboardKeys.poParties() });
        },
    });
};
