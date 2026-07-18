import { saleInvoiceApi } from "@/services/api/sale-invoice.api";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

const saleInvoiceKeys = {
    all: ["sale-invoices"] as const,
    woBillingData: (projectId: number) => [...saleInvoiceKeys.all, "wo-billing-data", projectId] as const,
    projectSaleInvoices: (projectId: number) => [...saleInvoiceKeys.all, "project", projectId] as const,
};

export const useWoBillingData = (projectId: number | null) => {
    return useQuery({
        queryKey: saleInvoiceKeys.woBillingData(projectId!),
        queryFn: () => saleInvoiceApi.getWoBillingData(projectId!),
        enabled: !!projectId,
    });
};

export const useCreateSaleInvoice = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (data: any) => saleInvoiceApi.createSaleInvoice(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: saleInvoiceKeys.all });
        },
    });
};

export const useProjectSaleInvoices = (projectId: number | null) => {
    return useQuery({
        queryKey: saleInvoiceKeys.projectSaleInvoices(projectId!),
        queryFn: () => saleInvoiceApi.getProjectSaleInvoices(projectId!),
        enabled: !!projectId,
    });
};
