import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { handleQueryError } from "@/lib/react-query";
import type { PaginatedResult } from "@/types/api.types";
import { courierService } from "@/services/api/courier.service";
import type {
    Courier,
    CourierDashboardCounts,
    CourierDashboardQueryParams,
    CourierDashboardRow,
    CourierDetails,
    CreateCourierInput,
    CreateDispatchInput,
    UpdateCourierInput,
    UpdateStatusInput,
} from "@/modules/shared/courier/helpers/courier.types";

export const courierKeys = {
    all: ["couriers"] as const,
    lists: () => [...courierKeys.all, "list"] as const,
    list: (params?: CourierDashboardQueryParams) => [...courierKeys.lists(), { params }] as const,
    myList: () => [...courierKeys.all, "my"] as const,
    byStatus: (status: number) => [...courierKeys.all, "status", status] as const,
    details: () => [...courierKeys.all, "detail"] as const,
    detail: (id: number) => [...courierKeys.details(), id] as const,
    dashboardCounts: () => [...courierKeys.all, "dashboard-counts"] as const,
};

export const useCourierDashboard = (params: CourierDashboardQueryParams = {}) => {
    return useQuery<PaginatedResult<CourierDashboardRow>>({
        queryKey: courierKeys.list(params),
        queryFn: () => courierService.getDashboard(params),
        placeholderData: previousData => previousData,
    });
};

export const useCourierDashboardCounts = () => {
    return useQuery<CourierDashboardCounts>({
        queryKey: courierKeys.dashboardCounts(),
        queryFn: () => courierService.getDashboardCounts(),
    });
};

export const useAllCouriers = () => {
    return useQuery<Courier[]>({
        queryKey: courierKeys.lists(),
        queryFn: () => courierService.getAll(),
    });
};

export const useMyCouriers = () => {
    return useQuery<Courier[]>({
        queryKey: courierKeys.myList(),
        queryFn: () => courierService.getMyCouriers(),
    });
};

export const useCourierOptions = () => {
    const { data: courier = [] } = useAllCouriers();
    return useMemo(
        () =>
            Array.isArray(courier)
                ? courier.map((c: Courier) => ({
                      value: String(c.id),
                      label: `${c.id} - ${c.toOrg}`,
                  }))
                : [],
        [courier]
    );
};

export const useCouriersByStatus = (status: number) => {
    return useQuery<Courier[]>({
        queryKey: courierKeys.byStatus(status),
        queryFn: () => courierService.getByStatus(status),
    });
};

export const useCourier = (id: number) => {
    return useQuery<Courier>({
        queryKey: courierKeys.detail(id),
        queryFn: () => courierService.getById(id),
        enabled: !!id,
    });
};

export const useCourierDetails = (id: number) => {
    return useQuery<CourierDetails>({
        queryKey: [...courierKeys.detail(id), "details"],
        queryFn: () => courierService.getByIdWithDetails(id),
        enabled: !!id,
    });
};

export const useCreateCourier = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ data, filenames }: { data: CreateCourierInput; filenames?: string[] }) =>
            courierService.create({ data, filenames }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: courierKeys.all });
            toast.success("Courier request created successfully");
        },
        onError: error => {
            toast.error(handleQueryError(error));
        },
    });
};

export const useUpdateCourier = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ id, data }: { id: number; data: UpdateCourierInput }) => courierService.update(id, data),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: courierKeys.all });
            queryClient.invalidateQueries({ queryKey: courierKeys.detail(variables.id) });
            toast.success("Courier updated successfully");
        },
        onError: error => {
            toast.error(handleQueryError(error));
        },
    });
};

export const useUpdateCourierStatus = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ id, data }: { id: number; data: UpdateStatusInput }) => courierService.updateStatus(id, data),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: courierKeys.all });
            queryClient.invalidateQueries({ queryKey: courierKeys.detail(variables.id) });
            toast.success("Courier status updated successfully");
        },
        onError: error => {
            toast.error(handleQueryError(error));
        },
    });
};

export const useCreateCourierDispatch = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ id, data }: { id: number; data: CreateDispatchInput }) => courierService.createDispatch(id, data),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: courierKeys.all });
            queryClient.invalidateQueries({ queryKey: courierKeys.detail(variables.id) });
            toast.success("Courier dispatched successfully");
        },
        onError: error => {
            toast.error(handleQueryError(error));
        },
    });
};

export const useUpdateCourierDispatch = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ id, data }: { id: number; data: CreateDispatchInput }) => courierService.updateDispatch(id, data),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: courierKeys.all });
            queryClient.invalidateQueries({ queryKey: courierKeys.detail(variables.id) });
            toast.success("Dispatch info updated successfully");
        },
        onError: error => {
            toast.error(handleQueryError(error));
        },
    });
};

export const useUploadCourierDocs = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ id, files }: { id: number; files: string[] }) => courierService.uploadDocs(id, files),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: courierKeys.all });
            toast.success("Documents uploaded successfully");
        },
        onError: error => {
            toast.error(handleQueryError(error));
        },
    });
};

export const useDeleteCourier = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (id: number) => courierService.remove(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: courierKeys.all });
            toast.success("Courier deleted successfully");
        },
        onError: error => {
            toast.error(handleQueryError(error));
        },
    });
};

export const useUploadDeliveryPod = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ id, file }: { id: number; file: string }) => courierService.uploadDeliveryPod(id, file),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: courierKeys.all });
            toast.success("Delivery POD uploaded successfully");
        },
        onError: error => {
            toast.error(handleQueryError(error));
        },
    });
};
