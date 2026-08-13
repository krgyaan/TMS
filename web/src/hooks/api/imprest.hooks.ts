import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { imprestService } from "@/services/api";
import type { CreateImprestCreditPayload, EmployeeImprestSummary } from "@/modules/imprest/helpers/imprest-admin.types";
import type { EmployeeImprestDashboard, EmployeeImprestTransactionRow, ImprestPaymentHistoryRow, ImprestRow, ImprestVoucherListResponse } from "@/modules/imprest/helpers/imprest.types";

/* ---------------- QUERY KEYS ---------------- */

export const imprestKeys = {
    root: ["employee-imprest"] as const,
    list: (userId?: number) => [...imprestKeys.root, "list", userId ?? "me"] as const,
    detail: (id: number) => [...imprestKeys.root, "detail", id] as const,
    transactions: (userId?: number) => [...imprestKeys.root, "transactions", userId ?? "me"] as const,
};

export const imprestVoucherKeys = {
    root: ["imprest-vouchers"] as const,
    list: (userId?: number) => [...imprestVoucherKeys.root, "list", userId ?? "all"] as const,
    detail: (params: { userId: number; from: string; to: string }) => [...imprestVoucherKeys.root, "detail", params] as const,
};

export const imprestPaymentHistoryKeys = {
    all: ["imprest-payment-history"] as const,
    byUser: (userId: number) => ["imprest-payment-history", userId] as const,
    list: (userId?: number) => [...imprestPaymentHistoryKeys.all, userId ?? "all"] as const,
};

export const imprestSummaryKeys = {
    root: ["employee-imprest-summary"] as const,
};

/* ---------------- IMPREST LIST ---------------- */

export const useImprestList = (userId?: number, params?: { page?: number; limit?: number; search?: string }) => {
    return useQuery<EmployeeImprestDashboard>({
        queryKey: [...imprestKeys.list(userId), { params }],

        queryFn: () => {
            if (userId) {
                return imprestService.getUserDashboard(userId, params);
            }
            return imprestService.getMyDashboard(params);
        },

        // Enable:
        // - When viewing own page (userId undefined)
        // - When viewing another user (valid userId number)
        enabled: userId === undefined || typeof userId === "number",
    });
};

/* ---------------- TRANSACTIONS ---------------- */

export const useImprestTransactions = (userId?: number) => {
    return useQuery<EmployeeImprestTransactionRow[]>({
        queryKey: imprestKeys.transactions(userId),

        queryFn: () => {
            if (userId) {
                return imprestService.getUserTransactions(userId);
            }
            return imprestService.getMyTransactions();
        },

        enabled: userId === undefined || typeof userId === "number",
    });
};

/* ---------------- CREATE ---------------- */

export const useCreateImprest = () => {
    const qc = useQueryClient();

    return useMutation({
        mutationFn: ({ data, files }: { data: Record<string, unknown>; files: File[] }) => imprestService.create({ data, files }),
        onSuccess: () => {
            toast.success("Imprest created successfully");
            qc.invalidateQueries({ queryKey: imprestKeys.root });
        },
        onError: (e) => {
            const responseMessage = (e as { response?: { data?: { message?: string | string[] } } })?.response?.data?.message;
            const errorMessage = Array.isArray(responseMessage)
                ? responseMessage.filter(Boolean).join(", ")
                : responseMessage || "Something went wrong";
            toast.error(`Failed to create imprest: ${errorMessage}`);
        },
    });
};

/* ---------------- DELETE ---------------- */

export const useDeleteImprest = () => {
    const qc = useQueryClient();

    return useMutation({
        mutationFn: (id: number) => imprestService.remove(id),

        onSuccess: () => {
            toast.success("Deleted successfully");
            qc.invalidateQueries({ queryKey: imprestKeys.root });
        },

        onError: () => toast.error("Failed to delete imprest"),
    });
};

/* ---------------- APPROVE (toggle) ---------------- */

export const useApproveImprest = () => {
    const qc = useQueryClient();

    return useMutation({
        mutationFn: (id: number) => imprestService.approveToggle(id),

        onSuccess: () => {
            toast.success("Approval status updated");
            qc.invalidateQueries({ queryKey: imprestKeys.root });
        },

        onError: () => toast.error("Failed to update approval"),
    });
};

/* ---------------- TALLY (toggle) ---------------- */

export const useTallyImprest = () => {
    const qc = useQueryClient();

    return useMutation({
        mutationFn: (id: number) => imprestService.tallyToggle(id),

        onSuccess: () => {
            toast.success("Tally status updated");
            qc.invalidateQueries({ queryKey: imprestKeys.root });
        },

        onError: () => toast.error("Failed to update tally status"),
    });
};

/* ---------------- PROOF (toggle) ---------------- */

export const useProofImprest = () => {
    const qc = useQueryClient();

    return useMutation({
        mutationFn: (id: number) => imprestService.proofToggle(id),

        onSuccess: () => {
            toast.success("Proof status updated");
            qc.invalidateQueries({ queryKey: imprestKeys.root });
        },

        onError: () => toast.error("Failed to update proof status"),
    });
};

/* ---------------- REMARK ---------------- */

export const useAddImprestAccRemark = () => {
    const qc = useQueryClient();

    return useMutation({
        mutationFn: ({ id, remark }: { id: number; remark: string }) => imprestService.addAccRemark(id, remark),

        onSuccess: () => {
            toast.success("Remark added successfully");
            qc.invalidateQueries({ queryKey: imprestKeys.root });
        },

        onError: () => toast.error("Failed to add remark"),
    });
};

/* ---------------- UPLOAD PROOFS ---------------- */

export const useUploadImprestProofs = () => {
    const qc = useQueryClient();

    return useMutation({
        mutationFn: ({ id, files }: { id: number; files: File[] }) => imprestService.uploadProofs(id, files),

        onSuccess: () => {
            toast.success("Proofs uploaded");
            qc.invalidateQueries({ queryKey: imprestKeys.root });
        },

        onError: () => toast.error("Failed to upload proofs"),
    });
};

/* ---------------- VOUCHERS ---------------- */

export const useImprestVoucherList = (userId?: number, params?: { page?: number; limit?: number; search?: string; fy?: number }) => {
    return useQuery<ImprestVoucherListResponse>({
        queryKey: [...imprestVoucherKeys.list(userId), { params }],
        queryFn: () => imprestService.getVouchers({ userId, ...params }),
        enabled: userId === undefined || typeof userId === "number",
    });
};

export const useImprestVoucherView = (params: { userId: number; from: string; to: string }) => {
    return useQuery({
        queryKey: imprestVoucherKeys.detail(params),
        queryFn: () => imprestService.getVoucherView(params),
        enabled: !!params.userId && !!params.from && !!params.to,
    });
};

/**
 * ==========================
 * PAYMENT HISTORY (BY USER)
 * ==========================
 */
export const useImprestPaymentHistory = (userId?: number) => {
    return useQuery<ImprestPaymentHistoryRow[]>({
        queryKey: imprestPaymentHistoryKeys.list(userId),
        queryFn: () => imprestService.getPaymentHistory(userId),
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
        mutationFn: (id: number) => imprestService.deletePaymentHistory(id),
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: imprestPaymentHistoryKeys.all,
                exact: false,
            });
        },
    });
};

export const useAccountApproveVoucher = () => {
    const qc = useQueryClient();

    return useMutation({
        mutationFn: (payload: { id: number; remark?: string; approve: boolean }) => imprestService.accountApproveVoucher(payload),

        onSuccess: () => {
            toast.success("Voucher updated successfully");
            qc.invalidateQueries({ queryKey: imprestVoucherKeys.root });
            qc.invalidateQueries({ queryKey: imprestKeys.root });
        },

        onError: () => toast.error("Failed to update voucher"),
    });
};

export const useAdminApproveVoucher = () => {
    const qc = useQueryClient();

    return useMutation({
        mutationFn: (payload: { id: number; remark?: string; approve: boolean }) => imprestService.adminApproveVoucher(payload),

        onSuccess: () => {
            toast.success("Voucher updated successfully");
            qc.invalidateQueries({ queryKey: imprestVoucherKeys.root });
            qc.invalidateQueries({ queryKey: imprestKeys.root });
        },

        onError: () => toast.error("Failed to update voucher"),
    });
};

export const useUpdateImprest = () => {
    const qc = useQueryClient();

    return useMutation({
        mutationFn: ({ id, data }: { id: number; data: Partial<ImprestRow> }) => imprestService.update(id, data),

        onSuccess: () => {
            toast.success("Updated successfully");
            qc.invalidateQueries({ queryKey: imprestKeys.root });
        },

        onError: (e) => {
            const responseMessage = (e as { response?: { data?: { message?: string | string[] } } })?.response?.data?.message;
            const errorMessage = Array.isArray(responseMessage)
                ? responseMessage.filter(Boolean).join(", ")
                : responseMessage || "Something went wrong";
            toast.error(`Failed to update imprest: ${errorMessage}`);
        },
    });
};

export const useCreditImprest = () => {
    const qc = useQueryClient();

    return useMutation({
        mutationFn: (data: CreateImprestCreditPayload) => imprestService.credit(data),

        onSuccess: () => {
            toast.success("Transfer recorded successfully");
            qc.invalidateQueries({ queryKey: imprestKeys.root });
            qc.invalidateQueries({ queryKey: imprestPaymentHistoryKeys.all });
        },

        onError: () => toast.error("Failed to record transfer"),
    });
};


export const useImprestDetail = (id: number) => {
    return useQuery({
        queryKey: imprestKeys.detail(id),
        queryFn: () => imprestService.getById(id),
        enabled: !!id && id > 0,
    });
};

export const useDeleteImprestProof = () => {
    const qc = useQueryClient();
    
    return useMutation({
        mutationFn: ({ id, filename }: { id: number; filename: string }) => 
            imprestService.deleteProof(id, filename),
        onSuccess: (_, variables) => {
            toast.success("Proof deleted successfully");
            qc.invalidateQueries({ queryKey: imprestKeys.detail(variables.id) });
            qc.invalidateQueries({ queryKey: imprestKeys.root });
        },
        onError: () => toast.error("Failed to delete proof"),
    });
};

/* ---------------- ADMIN SUMMARY ---------------- */

export const useEmployeeImprestSummary = () => {
    return useQuery<EmployeeImprestSummary[]>({
        queryKey: imprestSummaryKeys.root,
        queryFn: () => imprestService.getSummary(),
    });
};

export const useCreateImprestCredit = () => {
    const qc = useQueryClient();

    return useMutation({
        mutationFn: (data: CreateImprestCreditPayload) => imprestService.credit(data),

        onSuccess: (_, variables) => {
            toast.success("Imprest paid successfully");

            qc.invalidateQueries({ queryKey: imprestSummaryKeys.root });

            qc.invalidateQueries({
                queryKey: ["imprest-payment-history", variables.userId],
            });
        },

        onError: (err: Error) => {
            const message = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
            toast.error(message || "Failed to pay imprest. Please try again.");
        },
    });
};
