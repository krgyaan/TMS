// imprest-admin.hooks.ts
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { deleteImprestPaymentHistory, getEmployeeImprestSummary, getImprestPaymentHistory, createImprestCredit } from "./imprest-admin.api";
import type { EmployeeImprestSummary, ImprestPaymentHistoryRow } from "./imprest-admin.types";
import { toast } from "sonner";

export const useEmployeeImprestSummary = () => {
    return useQuery<EmployeeImprestSummary[]>({
        queryKey: ["employee-imprest-summary"],
        queryFn: getEmployeeImprestSummary,
    });
};

export const imprestPaymentHistoryKeys = {
    all: ["imprest-payment-history"] as const,
    byUser: (userId: number) => ["imprest-payment-history", userId] as const,
};

/**
 * ==========================
 * PAYMENT HISTORY (BY USER)
 * ==========================
 */
export const useImprestPaymentHistory = (userId: number) => {
    return useQuery<ImprestPaymentHistoryRow[]>({
        queryKey: imprestPaymentHistoryKeys.byUser(userId),
        queryFn: () => getImprestPaymentHistory(userId),
        enabled: !!userId,
    });
};

/**
 * ==========================
 * DELETE PAYMENT HISTORY
 * ==========================
 */
export const useDeleteImprestPaymentHistory = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: deleteImprestPaymentHistory,
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: imprestPaymentHistoryKeys.all,
            });
        },
    });
};

export const useCreateImprestCredit = () => {
    const qc = useQueryClient();

    return useMutation({
        mutationFn: createImprestCredit,

        onSuccess: (_, variables) => {
            toast.success("Imprest paid successfully");

            qc.invalidateQueries({ queryKey: ["employee-imprest-summary"] });

            qc.invalidateQueries({
                queryKey: ["imprest-payment-history", variables.userId],
            });
        },

        onError: (err: any) => {
            toast.error(err?.response?.data?.message || "Failed to pay imprest. Please try again.");
        },
    });
};
