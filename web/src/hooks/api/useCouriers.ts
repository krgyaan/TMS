// src/hooks/use-couriers.ts
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { courierApi } from "@/services/courier.service";
import type { CreateCourierInput, UpdateCourierInput, UpdateStatusInput, UpdateDispatchInput, CreateDispatchInput } from "@/types/courier.types";

// Query keys
export const courierKeys = {
    all: ["couriers"] as const,
    dashboard: () => [...courierKeys.all, "dashboard"] as const,
    list: () => [...courierKeys.all, "list"] as const,
    myList: () => [...courierKeys.all, "my"] as const,
    byStatus: (status: number) => [...courierKeys.all, "status", status] as const,
    detail: (id: number) => [...courierKeys.all, "detail", id] as const,
};

/**
 * Get dashboard data (grouped by status)
 */
export const useCourierDashboard = () => {
    return useQuery({
        queryKey: courierKeys.dashboard(),
        queryFn: courierApi.getDashboardData,
    });
};

/**
 * Get all couriers
 */
export const useAllCouriers = () => {
    return useQuery({
        queryKey: courierKeys.list(),
        queryFn: courierApi.getAll,
    });
};

/**
 * Get my couriers
 */
export const useMyCouriers = () => {
    return useQuery({
        queryKey: courierKeys.myList(),
        queryFn: courierApi.getMyCouriers,
    });
};

/**
 * Get couriers by status
 */
export const useCouriersByStatus = (status: number) => {
    return useQuery({
        queryKey: courierKeys.byStatus(status),
        queryFn: () => courierApi.getByStatus(status),
    });
};

/**
 * Get single courier
 */
export const useCourier = (id: number) => {
    return useQuery({
        queryKey: courierKeys.detail(id),
        queryFn: () => courierApi.getById(id),
        enabled: !!id,
    });
};

/**
 * Create courier
 */
export const useCreateCourier = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: courierApi.create,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: courierKeys.all });
            toast.success("Courier request created successfully");
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.message || "Failed to create courier request");
        },
    });
};

/**
 * Update courier
 */
export const useUpdateCourier = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ id, data }: { id: number; data: UpdateCourierInput }) => courierApi.update(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: courierKeys.all });
            toast.success("Courier updated successfully");
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.message || "Failed to update courier");
        },
    });
};

/**
 * Update courier status
 */
export const useUpdateCourierStatus = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ id, data }: { id: number; data: UpdateStatusInput }) => courierApi.updateStatus(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: courierKeys.all });
            toast.success("Status updated successfully");
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.message || "Failed to update status");
        },
    });
};

/**
 * Create dispatch info
 */

export const useCreateCourierDispatch = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ id, data }: { id: number; data: CreateDispatchInput }) => courierApi.createDispatch(id, data),

        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: courierKeys.all });
            queryClient.invalidateQueries({ queryKey: courierKeys.detail(variables.id) });
            toast.success("Dispatch request created successfully");
        },

        onError: (error: any) => {
            const backendMessage = error?.response?.data?.message || error?.response?.data?.error || error?.message;

            const finalMessage = Array.isArray(backendMessage) ? backendMessage[0] : backendMessage || "Failed to dispatch courier";

            toast.error(finalMessage);
        },
    });
};
/**
 * Update dispatch info
 */
export const useUpdateCourierDispatch = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ id, data }: { id: number; data: UpdateDispatchInput }) => courierApi.updateDispatch(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: courierKeys.all });
            toast.success("Dispatch info updated successfully");
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.message || "Failed to update dispatch info");
        },
    });
};

/**
 * Upload courier documents
 */
export const useUploadCourierDocs = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ id, files }: { id: number; files: File[] }) => courierApi.uploadDocs(id, files),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: courierKeys.all });
            toast.success("Documents uploaded successfully");
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.message || "Failed to upload documents");
        },
    });
};

/**
 * Delete courier
 */
export const useDeleteCourier = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: courierApi.delete,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: courierKeys.all });
            toast.success("Courier deleted successfully");
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.message || "Failed to delete courier");
        },
    });
};

/**
 * Upload delivery POD
 */
export const useUploadDeliveryPod = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ id, file }: { id: number; file: File }) => courierApi.uploadDeliveryPod(id, file),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: courierKeys.all });
            toast.success("Delivery POD uploaded successfully");
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.message || "Failed to upload POD");
        },
    });
};
