import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { amcBillingService } from "@/services/api";
import type { BillingPathField } from "@/modules/services/amc-billing/helpers/amc-billing.types";
import { handleQueryError } from "@/lib/react-query";
import { toast } from "sonner";

export const amcBillingKeys = {
    all: ["amc-billing"] as const,
    lists: () => [...amcBillingKeys.all, "list"] as const,
    list: (amcId?: number) => [...amcBillingKeys.lists(), { amcId }] as const,
    details: () => [...amcBillingKeys.all, "detail"] as const,
    detail: (id: number) => [...amcBillingKeys.details(), id] as const,
};

export const useAmcBillings = (amcId?: number) => {
    return useQuery({
        queryKey: amcBillingKeys.list(amcId),
        queryFn: () => amcBillingService.getAll(amcId),
    });
};

export const useAmcBilling = (id: number) => {
    return useQuery({
        queryKey: amcBillingKeys.detail(id),
        queryFn: () => amcBillingService.getById(id),
        enabled: !!id,
    });
};

export const useAmcBillingFileUpload = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, field, file }: { id: number; field: BillingPathField; file: File }) =>
            amcBillingService.uploadFile(id, field, file),
        onSuccess: (_data, variables) => {
            queryClient.invalidateQueries({ queryKey: amcBillingKeys.lists() });
            queryClient.invalidateQueries({ queryKey: amcBillingKeys.detail(variables.id) });
            toast.success("File uploaded successfully");
        },
        onError: error => toast.error(handleQueryError(error)),
    });
};
