// src/modules/imprest/imprest.hooks.ts

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import {
    getMyImprests,
    getUserImprests,
    createImprest,
    updateImprest,
    deleteImprest,
    uploadImprestProofs,

    // vouchers
    getImprestVouchers,
    getImprestVoucherById,
    accountApproveVoucher,
    adminApproveVoucher,

    // NEW – imprest actions
    approveImprest,
    tallyImprest,
    proofImprest,
    addImprestRemark,
    type CreateImprestInput,
} from "./imprest.api";

import type { ImprestVoucherRow } from "./imprest.types";

/* ---------------- QUERY KEYS ---------------- */

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

/* ---------------- IMPREST LIST ---------------- */

export const useImprestList = (userId?: number) => {
    return useQuery({
        queryKey: imprestKeys.list(userId),
        queryFn: () => (userId ? getUserImprests(userId) : getMyImprests()),
        enabled: userId === undefined || !!userId,
    });
};

/* ---------------- CREATE ---------------- */

export const useCreateImprest = () => {
    const qc = useQueryClient();

    return useMutation({
        mutationFn: createImprest,
        onSuccess: () => {
            toast.success("Imprest created successfully");
            qc.invalidateQueries({ queryKey: imprestKeys.root });
        },
        onError: () => toast.error("Failed to create imprest"),
    });
};

/* ---------------- UPDATE ---------------- */

export const useUpdateImprest = () => {
    const qc = useQueryClient();

    return useMutation({
        mutationFn: ({ id, data }: { id: number; data: any }) => updateImprest(id, data),

        onSuccess: () => {
            toast.success("Updated successfully");
            qc.invalidateQueries({ queryKey: imprestKeys.root });
        },

        onError: () => toast.error("Failed to update imprest"),
    });
};

/* ---------------- DELETE ---------------- */

export const useDeleteImprest = () => {
    const qc = useQueryClient();

    return useMutation({
        mutationFn: (id: number) => deleteImprest(id),

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
        mutationFn: (id: number) => approveImprest(id),

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
        mutationFn: (id: number) => tallyImprest(id),

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
        mutationFn: (id: number) => proofImprest(id),

        onSuccess: () => {
            toast.success("Proof status updated");
            qc.invalidateQueries({ queryKey: imprestKeys.root });
        },

        onError: () => toast.error("Failed to update proof status"),
    });
};

/* ---------------- REMARK ---------------- */

export const useAddImprestRemark = () => {
    const qc = useQueryClient();

    return useMutation({
        mutationFn: ({ id, remark }: { id: number; remark: string }) => addImprestRemark(id, remark),

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
        mutationFn: ({ id, files }: { id: number; files: File[] }) => uploadImprestProofs(id, files),

        onSuccess: () => {
            toast.success("Proofs uploaded");
            qc.invalidateQueries({ queryKey: imprestKeys.root });
        },

        onError: () => toast.error("Failed to upload proofs"),
    });
};

/* ---------------- VOUCHERS ---------------- */

export const useImprestVoucherList = (userId?: number) => {
    return useQuery({
        queryKey: imprestVoucherKeys.list(userId),
        queryFn: () => getImprestVouchers({ userId }),
    });
};

export const useImprestVoucherView = (id: number) => {
    return useQuery({
        queryKey: imprestVoucherKeys.detail(id),
        queryFn: () => getImprestVoucherById(id),
        enabled: !!id,
    });
};

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
