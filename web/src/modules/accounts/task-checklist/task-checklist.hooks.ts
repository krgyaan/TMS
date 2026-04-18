// src/modules/accounts/checklist/checklist.hooks.ts

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { checklistApi } from "./task-checklist.service";
import type {
    CreateChecklistInput,
    UpdateChecklistInput,
    ResponsibilityRemarkInput,
    AccountabilityRemarkInput,
    GetTasksInput,
} from "./task-checklist.types";

// Query keys
export const checklistKeys = {
    all: ["checklists"] as const,
    index: () => [...checklistKeys.all, "index"] as const,
    list: () => [...checklistKeys.all, "list"] as const,
    detail: (id: number) => [...checklistKeys.all, "detail", id] as const,
    tasks: (params: GetTasksInput) => [...checklistKeys.all, "tasks", params] as const,
};

/**
 * Get index data (for dashboard view)
 */
export const useChecklistIndex = () => {
    return useQuery({
        queryKey: checklistKeys.index(),
        queryFn: checklistApi.getIndexData,
    });
};

/**
 * Get all checklists
 */
export const useAllChecklists = () => {
    return useQuery({
        queryKey: checklistKeys.list(),
        queryFn: checklistApi.getAll,
    });
};

/**
 * Get single checklist
 */
export const useChecklist = (id: number) => {
    return useQuery({
        queryKey: checklistKeys.detail(id),
        queryFn: () => checklistApi.getById(id),
        enabled: !!id,
    });
};

/**
 * Create checklist
 */
export const useCreateChecklist = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: checklistApi.create,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: checklistKeys.all });
            toast.success("Checklist created successfully");
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.message || "Failed to create checklist");
        },
    });
};

/**
 * Update checklist
 */
export const useUpdateChecklist = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ id, data }: { id: number; data: UpdateChecklistInput }) => checklistApi.update(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: checklistKeys.all });
            toast.success("Checklist updated successfully");
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.message || "Failed to update checklist");
        },
    });
};

/**
 * Delete checklist
 */
export const useDeleteChecklist = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: checklistApi.delete,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: checklistKeys.all });
            toast.success("Checklist deleted successfully");
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.message || "Failed to delete checklist");
        },
    });
};

/**
 * Store responsibility remark
 */
export const useStoreResponsibilityRemark = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ id, data, file }: { id: number; data: ResponsibilityRemarkInput; file?: File }) =>
            checklistApi.storeResponsibilityRemark(id, data, file),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: checklistKeys.all });
            toast.success("Responsibility remark saved successfully");
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.message || "Failed to save responsibility remark");
        },
    });
};

/**
 * Store accountability remark
 */
export const useStoreAccountabilityRemark = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ id, data, file }: { id: number; data: AccountabilityRemarkInput; file?: File }) =>
            checklistApi.storeAccountabilityRemark(id, data, file),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: checklistKeys.all });
            toast.success("Accountability remark saved successfully");
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.message || "Failed to save accountability remark");
        },
    });
};

/**
 * Get tasks for report
 */
export const useChecklistTasks = (params: GetTasksInput, enabled: boolean = true) => {
    return useQuery({
        queryKey: checklistKeys.tasks(params),
        queryFn: () => checklistApi.getTasks(params),
        enabled: enabled && !!params.user && !!params.month,
    });
};