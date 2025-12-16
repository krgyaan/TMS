// imprest-admin.hooks.ts
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { deleteImprestPaymentHistory, getEmployeeImprestSummary, getImprestPaymentHistory } from "./imprest-admin.api";
import type { EmployeeImprestSummary, ImprestPaymentHistoryRow } from "./imprest-admin.types";

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
