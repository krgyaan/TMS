import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { amcBillingService } from "@/services/api";
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

export const useAddInvoices = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, files }: { id: number; files: File[] }) =>
            amcBillingService.addInvoices(id, files),
        onSuccess: (_data, variables) => {
            queryClient.invalidateQueries({ queryKey: amcBillingKeys.lists() });
            queryClient.invalidateQueries({ queryKey: amcBillingKeys.detail(variables.id) });
            toast.success("Invoices uploaded successfully");
        },
        onError: error => toast.error(handleQueryError(error)),
    });
};

export const useAddReceipts = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, files }: { id: number; files: File[] }) =>
            amcBillingService.addReceipts(id, files),
        onSuccess: (_data, variables) => {
            queryClient.invalidateQueries({ queryKey: amcBillingKeys.lists() });
            queryClient.invalidateQueries({ queryKey: amcBillingKeys.detail(variables.id) });
            toast.success("Receipts uploaded successfully");
        },
        onError: error => toast.error(handleQueryError(error)),
    });
};

export const useRemoveInvoice = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, index }: { id: number; index: number }) =>
            amcBillingService.removeInvoice(id, index),
        onSuccess: (_data, variables) => {
            queryClient.invalidateQueries({ queryKey: amcBillingKeys.lists() });
            queryClient.invalidateQueries({ queryKey: amcBillingKeys.detail(variables.id) });
            toast.success("Invoice removed");
        },
        onError: error => toast.error(handleQueryError(error)),
    });
};

export const useRemoveReceipt = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, index }: { id: number; index: number }) =>
            amcBillingService.removeReceipt(id, index),
        onSuccess: (_data, variables) => {
            queryClient.invalidateQueries({ queryKey: amcBillingKeys.lists() });
            queryClient.invalidateQueries({ queryKey: amcBillingKeys.detail(variables.id) });
            toast.success("Receipt removed");
        },
        onError: error => toast.error(handleQueryError(error)),
    });
};

export const useAmcBillingFollowup = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id: number) => amcBillingService.followup(id),
        onSuccess: (_data, id) => {
            queryClient.invalidateQueries({ queryKey: amcBillingKeys.lists() });
            queryClient.invalidateQueries({ queryKey: amcBillingKeys.detail(id) });
            toast.success("Follow-up initiated");
        },
        onError: error => toast.error(handleQueryError(error)),
    });
};