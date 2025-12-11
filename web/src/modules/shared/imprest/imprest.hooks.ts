// src/modules/imprest/imprest.hooks.ts

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { getMyImprests, createImprest, updateImprest, deleteImprest, uploadImprestProofs, type CreateImprestInput } from "./imprest.api";

// ---------------- Query Keys ----------------
export const imprestKeys = {
    root: ["employee-imprest"] as const,
    list: () => [...imprestKeys.root, "list"] as const,
    detail: (id: number) => [...imprestKeys.root, "detail", id] as const,
};

// ---------------- LIST ----------------
export const useImprestList = () => {
    return useQuery({
        queryKey: imprestKeys.list(),
        queryFn: getMyImprests,
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

// ---------------- UPLOAD PROOFS ----------------
export const useUploadImprestProofs = () => {
    return useMutation({
        mutationFn: ({ id, files }: { id: number; files: File[] }) => uploadImprestProofs(id, files),
    });
};
