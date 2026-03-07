import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import { getFollowUps, createFollowUp, updateFollowUp, updateFollowUpStatus, deleteFollowUp, getFollowUpDetail } from "./follow-up.api";

import type { CreateFollowUpDto, UpdateFollowUpDto, UpdateFollowUpStatusDto, FollowUpQueryDto, FollowUpRow, FollowUpDetailsDto } from "./follow-up.types";
import { toast } from "sonner";

// =====================================
// API RESPONSE TYPE (LIST)
// =====================================
export interface FollowUpListResponse {
    data: FollowUpRow[];
    meta: {
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    };
}

// =====================================
// GET A SINGLE FOLLOW UP DETAIL
// =====================================
export const useFollowUp = (id: number) => {
    return useQuery<FollowUpDetailsDto>({
        queryKey: ["followUpDetails", id],
        queryFn: () => getFollowUpDetail(id),
        enabled: !!id,
    });
};

// =====================================
// GET EMD MAIL PREVIEW
// =====================================
export const useEmdMailPreview = (emdId: number | null) => {
    return useQuery({
        queryKey: ["emdMailPreview", emdId],
        queryFn: () => import("./follow-up.api").then(m => m.getEmdMailPreview(emdId!)),
        enabled: !!emdId,
        staleTime: 1000 * 60 * 5, // 5 mins
    });
};

// =====================================
// LIST HOOK ✅ (TYPED)
// =====================================
export const useFollowUpList = (query: FollowUpQueryDto) => {
    return useQuery<FollowUpListResponse>({
        queryKey: ["follow-ups", query],
        queryFn: () => getFollowUps(query),
    });
};

// =====================================
// CREATE ✅ (TYPED)
// =====================================
export const useCreateFollowUp = () => {
    const qc = useQueryClient();

    return useMutation({
        mutationFn: (payload: CreateFollowUpDto) => createFollowUp(payload),
        onSuccess: () => qc.invalidateQueries({ queryKey: ["follow-ups"] }),
    });
};

// =====================================
// UPDATE ✅ (TYPED)
// =====================================
export const useUpdateFollowUp = () => {
    const qc = useQueryClient();

    return useMutation({
        mutationFn: (payload: { id: number; data: FormData }) => updateFollowUp(payload),
        onSuccess: () => qc.invalidateQueries({ queryKey: ["follow-ups"] }),
    });
};

// =====================================
// UPDATE STATUS ✅ (TYPED)
// =====================================
export const useUpdateFollowUpStatus = () => {
    const qc = useQueryClient();

    return useMutation({
        mutationFn: (payload: { id: number; data: UpdateFollowUpStatusDto }) => updateFollowUpStatus(payload),
        onSuccess: () => qc.invalidateQueries({ queryKey: ["follow-ups"] }),
    });
};

// =====================================
// DELETE ✅ (TYPED)
// =====================================
export const useDeleteFollowUp = () => {
    const qc = useQueryClient();

    return useMutation({
        mutationFn: (id: number) => deleteFollowUp(id),

        onSuccess: (_, id) => {
            toast.success(`Follow-up deleted successfully`);
            qc.invalidateQueries({ queryKey: ["follow-ups"] });
        },

        onError: (error: any) => {
            toast.error(error?.response?.data?.message ?? error?.message ?? "Failed to delete follow-up");
        },
    });
};
