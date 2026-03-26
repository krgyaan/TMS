import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { hrmsAssetsService, type EmployeeAsset } from "@/services/api/hrms-assets.service";
import { handleQueryError } from "@/lib/react-query";
import { toast } from "sonner";

export const hrmsAssetKeys = {
    all: ["hrms-assets"] as const,
    detail: (id: number) => [...hrmsAssetKeys.all, id] as const,
    byUser: (userId: number) => [...hrmsAssetKeys.all, "user", userId] as const,
};

export const useHrmsAssetsAll = () => {
    return useQuery({
        queryKey: hrmsAssetKeys.all,
        queryFn: () => hrmsAssetsService.getAll(),
    });
};

export const useHrmsAssetsByUser = (userId?: number) => {
    return useQuery({
        queryKey: hrmsAssetKeys.byUser(userId!),
        queryFn: () => hrmsAssetsService.getByUserId(userId!),
        enabled: !!userId,
    });
};

export const useCreateHrmsAsset = () => {
    const queryClient = useQueryClient();

    return useMutation({
        // Accepts either the literal JS Object or a FormData instance for multipart uploads
        mutationFn: (data: Partial<EmployeeAsset> | FormData) => hrmsAssetsService.create(data as any),
        onSuccess: asset => {
            queryClient.invalidateQueries({ queryKey: hrmsAssetKeys.all });
            queryClient.invalidateQueries({ queryKey: hrmsAssetKeys.byUser(asset.userId) });
            toast.success("Asset assigned successfully");
        },
        onError: error => {
            toast.error(handleQueryError(error));
        },
    });
};

export const useUpdateHrmsAsset = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ id, data }: { id: number; data: Partial<EmployeeAsset> }) => 
            hrmsAssetsService.update(id, data),
        onSuccess: asset => {
            queryClient.invalidateQueries({ queryKey: hrmsAssetKeys.all });
            queryClient.invalidateQueries({ queryKey: hrmsAssetKeys.detail(asset.id) });
            queryClient.invalidateQueries({ queryKey: hrmsAssetKeys.byUser(asset.userId) });
            toast.success("Asset updated successfully");
        },
        onError: error => {
            toast.error(handleQueryError(error));
        },
    });
};
