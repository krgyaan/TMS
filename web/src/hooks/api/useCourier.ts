import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { handleQueryError } from "@/lib/react-query";
import type { PaginatedResult } from "@/types/api.types";
import { courierService } from "@/services/api/courier.service";
import { useDebouncedSearch } from "../useDebouncedSearch";
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

export const useMyCouriers = () => {
    return useQuery<Courier[]>({
        queryKey: courierKeys.myList(),
        queryFn: () => courierService.getMyCouriers(),
    });
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

export const useCourierSelectOptions = (selectedId?: string) => {
    const [query, setQuery] = useState('');
    const debouncedQuery = useDebouncedSearch(query, 300);
    const { data, isLoading } = useCourierDashboard({
        search: debouncedQuery || undefined,
        page: 1,
        limit: 20,
        sortBy: 'createdAt',
        sortOrder: 'desc',
    });

    const parsedSelectedId = selectedId ? Number(selectedId) : 0;
    const selectedCourierId = Number.isInteger(parsedSelectedId) && parsedSelectedId > 0 ? parsedSelectedId : 0;
    const { data: selectedCourier } = useCourier(selectedCourierId);

    const options = useMemo(() => {
        const rows = data?.data ?? [];
        const all = selectedCourier && !rows.some((row) => row.id === selectedCourier.id)
            ? [selectedCourier, ...rows]
            : rows;

        return all.map((c) => ({
            id: String(c.id),
            name: `${c.id} - ${c.toOrg} - ${c.toName}`,
            keywords: [c.toOrg, c.toName, c.toAddr, c.toPin, c.toMobile, c.courierProvider, c.docketNo, c.trackingNumber]
                .filter(Boolean)
                .join(' '),
        }));
    }, [data, selectedCourier]);

    return { options, onSearch: setQuery, isLoading, selectedCourier };
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
