// src/modules/imprest/imprest.hooks.ts

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
    getMyImprests,
    createImprest,
    updateImprest,
    deleteImprest,
    uploadImprestProofs,
    type CreateImprestInput,
    getUserImprests,
    getImprestVouchers,
    getImprestVoucherById,
    accountApproveVoucher,
    adminApproveVoucher,
} from "./imprest.api";
import type { ImprestVoucherRow } from "./imprest.types";

// ---------------- Query Keys ----------------
export const imprestKeys = {
    root: ["employee-imprest"] as const,

    list: (userId?: number) => [...imprestKeys.root, "list", userId ?? "me"] as const,

    detail: (id: number) => [...imprestKeys.root, "detail", id] as const,
};

export const imprestVoucherKeys = {
    root: ["imprest-vouchers"] as const,

    list: (userId?: number) => [...imprestVoucherKeys.root, "list", userId ?? "all"] as const,

    detail: (id: number) => [...imprestVoucherKeys.root, "detail", id] as const,
};
// ---------------- LIST ----------------
export const useImprestList = (userId?: number) => {
    return useQuery({
        queryKey: imprestKeys.list(userId), // IMPORTANT
        queryFn: () => (userId ? getUserImprests(userId) : getMyImprests()),
        enabled: userId === undefined || !!userId,
    });
};

// ---------------- CREATE ----------------
export const useCreateImprest = () => {
    const qc = useQueryClient();

    return useMutation({
        mutationFn: (data: CreateImprestInput) => createImprest(data),

        onSuccess: () => {
            toast.success("Imprest created successfully");
            qc.invalidateQueries({ queryKey: imprestKeys.list() });
        },

        onError: () => toast.error("Failed to create imprest"),
    });
};

// ---------------- UPDATE ----------------
export const useUpdateImprest = () => {
    const qc = useQueryClient();

    return useMutation({
        mutationFn: ({ id, data }: { id: number; data: any }) => updateImprest(id, data),

        onSuccess: () => {
            toast.success("Updated successfully");
            qc.invalidateQueries({ queryKey: imprestKeys.list() });
        },
        onError: () => toast.error("Failed to update imprest"),
    });
};

// ---------------- DELETE ----------------
export const useDeleteImprest = () => {
    const qc = useQueryClient();

    return useMutation({
        mutationFn: (id: number) => deleteImprest(id),

        onSuccess: () => {
            toast.success("Deleted successfully");
            qc.invalidateQueries({ queryKey: imprestKeys.list() });
        },

        onError: () => toast.error("Failed to delete imprest"),
    });
};

// ---------------- LIST ----------------
export const useImprestVoucherList = (userId?: number) => {
    return useQuery({
        queryKey: imprestVoucherKeys.list(userId),
        queryFn: () => getImprestVouchers({ userId }),
    });
};

// ---------------- DETAIL ----------------
export const useImprestVoucherView = (id: number) => {
    return useQuery({
        queryKey: imprestVoucherKeys.detail(id),
        queryFn: () => getImprestVoucherById(id),
        enabled: !!id,
    });
};

// ---------------- ACCOUNT APPROVE ----------------
export const useAccountApproveVoucher = () => {
    const qc = useQueryClient();

    return useMutation({
        mutationFn: accountApproveVoucher,

        onSuccess: () => {
            toast.success("Voucher updated successfully");
            qc.invalidateQueries({ queryKey: imprestVoucherKeys.root });
            qc.invalidateQueries({ queryKey: imprestKeys.root });
        },

        onError: () => toast.error("Failed to update voucher"),
    });
};

// ---------------- ADMIN APPROVE ----------------
export const useAdminApproveVoucher = () => {
    const qc = useQueryClient();

    return useMutation({
        mutationFn: adminApproveVoucher,

        onSuccess: () => {
            toast.success("Voucher updated successfully");
            qc.invalidateQueries({ queryKey: imprestVoucherKeys.root });
            qc.invalidateQueries({ queryKey: imprestKeys.root });
        },

        onError: () => toast.error("Failed to update voucher"),
    });
};

// ---------------- UPLOAD PROOFS ----------------
export const useUploadImprestProofs = () => {
    return useMutation({
        mutationFn: ({ id, files }: { id: number; files: File[] }) => uploadImprestProofs(id, files),
    });
};
