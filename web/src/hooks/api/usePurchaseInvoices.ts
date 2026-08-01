import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { purchaseInvoiceApi } from "@/services/api/purchase-invoice.api";

export function useAllPurchaseInvoices() {
    return useQuery({
        queryKey: ["purchase-invoices", "all"],
        queryFn: () => purchaseInvoiceApi.getAll(),
    });
}

export function usePurchaseInvoiceDetails(id: number) {
    return useQuery({
        queryKey: ["purchase-invoices", id],
        queryFn: () => purchaseInvoiceApi.getById(id),
        enabled: !!id,
    });
}

export function useProjectPurchaseInvoices(projectId: number) {
    return useQuery({
        queryKey: ["purchase-invoices", "project", projectId],
        queryFn: () => purchaseInvoiceApi.getByProject(projectId),
        enabled: !!projectId,
    });
}

export function useNextPINumber(projectName?: string, type?: "po" | "vwo") {
    return useQuery({
        queryKey: ["purchase-invoices", "next-number", projectName, type],
        queryFn: () => purchaseInvoiceApi.getNextNumber(projectName, type),
        enabled: !!projectName,
    });
}

export function useCreatePurchaseInvoice() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (data: any) => purchaseInvoiceApi.create(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["purchase-invoices"] });
            queryClient.invalidateQueries({ queryKey: ["vendor-work-orders"] });
        },
    });
}

export function useUpdatePurchaseInvoice() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, data }: { id: number; data: any }) =>
            purchaseInvoiceApi.update(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["purchase-invoices"] });
            queryClient.invalidateQueries({ queryKey: ["vendor-work-orders"] });
        },
    });
}
