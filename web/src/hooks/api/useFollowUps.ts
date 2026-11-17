import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { handleQueryError } from "@/lib/react-query";
import { followUpService } from "@/services/api/follow-up.service";
import type { PaginatedResult } from "@/types/api.types";
import type {
    CreateFollowUpDto,
    FollowUpCounts,
    FollowUpDetails,
    FollowUpListRow,
    FollowUpQueryParams,
    UpdateFollowUpPayload,
    UpdateFollowUpStatusPayload,
} from "@/modules/shared/follow-up/helpers/followUp.types";

export const followUpKeys = {
    all: ["follow-ups"] as const,
    lists: () => [...followUpKeys.all, "list"] as const,
    list: (params?: FollowUpQueryParams) => [...followUpKeys.lists(), { params }] as const,
    details: () => [...followUpKeys.all, "detail"] as const,
    detail: (id: number) => [...followUpKeys.details(), id] as const,
    counts: () => [...followUpKeys.all, "counts"] as const,
    preview: (emdId: number) => [...followUpKeys.all, "preview", emdId] as const,
};

export const useFollowUps = (params: FollowUpQueryParams = {}) => {
    return useQuery<PaginatedResult<FollowUpListRow>>({
        queryKey: followUpKeys.list(params),
        queryFn: () => followUpService.getAll(params),
        placeholderData: previousData => previousData,
    });
};

export const useFollowUp = (id: number | null) => {
    return useQuery<FollowUpDetails>({
        queryKey: followUpKeys.detail(id ?? 0),
        queryFn: () => followUpService.getById(id!),
        enabled: !!id,
    });
};

export const useFollowUpCounts = () => {
    return useQuery<FollowUpCounts>({
        queryKey: followUpKeys.counts(),
        queryFn: () => followUpService.getCounts(),
    });
};

export const useEmdMailPreview = (emdId: number | null) => {
    return useQuery({
        queryKey: followUpKeys.preview(emdId ?? 0),
        queryFn: () => followUpService.getPreviewMail(emdId!),
        enabled: !!emdId,
        staleTime: 1000 * 60 * 5,
    });
};

export const useCreateFollowUp = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (data: CreateFollowUpDto) => followUpService.create(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: followUpKeys.all });
            toast.success("Follow-up created successfully");
        },
        onError: error => {
            toast.error(handleQueryError(error));
        },
    });
};

export const useUpdateFollowUp = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ id, data }: { id: number; data: UpdateFollowUpPayload }) => followUpService.update(id, data),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: followUpKeys.all });
            queryClient.invalidateQueries({ queryKey: followUpKeys.detail(variables.id) });
            toast.success("Follow-up updated successfully");
        },
        onError: error => {
            toast.error(handleQueryError(error));
        },
    });
};

export const useUpdateFollowUpStatus = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ id, data }: { id: number; data: UpdateFollowUpStatusPayload }) => followUpService.updateStatus(id, data),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: followUpKeys.all });
            queryClient.invalidateQueries({ queryKey: followUpKeys.detail(variables.id) });
            toast.success("Follow-up status updated successfully");
        },
        onError: error => {
            toast.error(handleQueryError(error));
        },
    });
};

export const useDeleteFollowUp = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (id: number) => followUpService.remove(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: followUpKeys.all });
            toast.success("Follow-up deleted successfully");
        },
        onError: error => {
            toast.error(handleQueryError(error));
        },
    });
};
