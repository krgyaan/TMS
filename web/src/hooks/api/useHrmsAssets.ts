// src/hooks/api/useHrmsAssets.ts
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
    hrmsAssetsService,
    type EmployeeAsset,
    type AssetHistoryEntry,
    type StatusUpdatePayload,
} from "@/services/api/hrms-assets.service";
import { handleQueryError } from "@/lib/react-query";
import { toast } from "sonner";

export const hrmsAssetKeys = {
    all: ["hrms-assets"] as const,
    detail: (id: number) => [...hrmsAssetKeys.all, "detail", id] as const,
    details: (id: number) => [...hrmsAssetKeys.all, "details", id] as const,
    history: (id: number) => [...hrmsAssetKeys.all, "history", id] as const,
    byUser: (userId: number) => [...hrmsAssetKeys.all, "user", userId] as const,
};

// ─── Read Queries ─────────────────────────────────────────────────────────────

/**
 * Get all assets (with labels for display)
 */
export const useHrmsAssetsAll = () => {
    return useQuery({
        queryKey: hrmsAssetKeys.all,
        queryFn: () => hrmsAssetsService.getAll(),
    });
};

/**
 * Get assets by user ID
 */
export const useHrmsAssetsByUser = (userId?: number) => {
    return useQuery({
        queryKey: hrmsAssetKeys.byUser(userId!),
        queryFn: () => hrmsAssetsService.getByUserId(userId!),
        enabled: !!userId,
    });
};

/**
 * Get single asset (raw values - for edit forms)
 */
export const useHrmsAssetView = (id?: number) => {
    return useQuery({
        queryKey: hrmsAssetKeys.detail(id!),
        queryFn: () => hrmsAssetsService.getById(id!),
        enabled: !!id,
    });
};

/**
 * Get single asset with labels (for display/view pages)
 */
export const useHrmsAssetDetails = (id?: number) => {
    return useQuery({
        queryKey: hrmsAssetKeys.details(id!),
        queryFn: () => hrmsAssetsService.getByIdWithLabels(id!),
        enabled: !!id,
    });
};

/**
 * Get asset history timeline
 */
export const useHrmsAssetHistory = (id?: number) => {
    return useQuery<AssetHistoryEntry[]>({
        queryKey: hrmsAssetKeys.history(id!),
        queryFn: () => hrmsAssetsService.getHistory(id!),
        enabled: !!id,
    });
};

// ─── Write Mutations ──────────────────────────────────────────────────────────

/**
 * Create new asset (supports FormData for file uploads)
 */
export const useCreateHrmsAsset = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (data: Partial<EmployeeAsset> | FormData) =>
            hrmsAssetsService.create(data),
        onSuccess: (asset) => {
            queryClient.invalidateQueries({ queryKey: hrmsAssetKeys.all });
            if (asset?.userId) {
                queryClient.invalidateQueries({ queryKey: hrmsAssetKeys.byUser(asset.userId) });
            }
            toast.success("Asset assigned successfully");
        },
        onError: (error) => {
            toast.error(handleQueryError(error));
        },
    });
};

/**
 * Update asset (general edit - does not create history)
 */
export const useUpdateHrmsAsset = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ id, data }: {
            id: number;
            data: Partial<EmployeeAsset> | FormData;
        }) => hrmsAssetsService.update(id, data),
        onSuccess: (asset) => {
            queryClient.invalidateQueries({ queryKey: hrmsAssetKeys.all });
            queryClient.invalidateQueries({ queryKey: hrmsAssetKeys.detail(asset.id) });
            queryClient.invalidateQueries({ queryKey: hrmsAssetKeys.details(asset.id) });
            if (asset?.userId) {
                queryClient.invalidateQueries({ queryKey: hrmsAssetKeys.byUser(asset.userId) });
            }
            toast.success("Asset updated successfully");
        },
        onError: (error) => {
            toast.error(handleQueryError(error));
        },
    });
};

/**
 * Update asset status (creates history entry)
 */
export const useUpdateHrmsAssetStatus = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ id, data }: { id: number; data: StatusUpdatePayload }) =>
            hrmsAssetsService.updateStatus(id, data),
        onSuccess: (asset) => {
            queryClient.invalidateQueries({ queryKey: hrmsAssetKeys.all });
            queryClient.invalidateQueries({ queryKey: hrmsAssetKeys.detail(asset.id) });
            queryClient.invalidateQueries({ queryKey: hrmsAssetKeys.details(asset.id) });
            queryClient.invalidateQueries({ queryKey: hrmsAssetKeys.history(asset.id) });
            if (asset?.userId) {
                queryClient.invalidateQueries({ queryKey: hrmsAssetKeys.byUser(asset.userId) });
            }
            toast.success("Asset status updated successfully");
        },
        onError: (error) => {
            toast.error(handleQueryError(error));
        },
    });
};

/**
 * Delete asset
 */
export const useDeleteHrmsAsset = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (id: number) => hrmsAssetsService.deleteAsset(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: hrmsAssetKeys.all });
            toast.success("Asset deleted successfully");
        },
        onError: (error) => {
            toast.error(handleQueryError(error));
        },
    });
};