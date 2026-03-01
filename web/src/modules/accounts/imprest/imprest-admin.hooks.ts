// imprest-admin.hooks.ts
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getEmployeeImprestSummary, createImprestCredit } from "./imprest-admin.api";
import type { EmployeeImprestSummary } from "./imprest-admin.types";
import { toast } from "sonner";

export const useEmployeeImprestSummary = () => {
    return useQuery<EmployeeImprestSummary[]>({
        queryKey: ["employee-imprest-summary"],
        queryFn: getEmployeeImprestSummary,
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
