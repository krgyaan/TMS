import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { serviceVisitService } from "@/services/api";
import type { CreateServiceVisitReportDto, UpdateServiceVisitReportDto } from "@/modules/services/visit/helpers/service-visit.types";
import { handleQueryError } from "@/lib/react-query";
import { toast } from "sonner";

export const serviceVisitKeys = {
    all: ["service-visit-reports"] as const,
    lists: () => [...serviceVisitKeys.all, "list"] as const,
    list: (complaintId?: number) => [...serviceVisitKeys.lists(), { complaintId }] as const,
    joinedList: () => [...serviceVisitKeys.all, "joined-list"] as const,
    details: () => [...serviceVisitKeys.all, "detail"] as const,
    detail: (id: number) => [...serviceVisitKeys.details(), id] as const,
};

export const useServiceVisits = (complaintId?: number) => {
    return useQuery({
        queryKey: serviceVisitKeys.list(complaintId),
        queryFn: () => serviceVisitService.getAll(complaintId),
    });
};

export const useServiceVisitList = () => {
    return useQuery({
        queryKey: serviceVisitKeys.joinedList(),
        queryFn: () => serviceVisitService.getList(),
    });
};

export const useServiceVisit = (id: number) => {
    return useQuery({
        queryKey: serviceVisitKeys.detail(id),
        queryFn: () => serviceVisitService.getById(id),
        enabled: !!id,
    });
};

export const useServiceVisitByComplaint = (complaintId: number) => {
    return useQuery({
        queryKey: [...serviceVisitKeys.all, "by-complaint", complaintId],
        queryFn: () => serviceVisitService.getByComplaintId(complaintId),
        enabled: !!complaintId,
    });
};

export const useCreateServiceVisit = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (data: CreateServiceVisitReportDto) => serviceVisitService.create(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: serviceVisitKeys.lists() });
            queryClient.invalidateQueries({ queryKey: serviceVisitKeys.joinedList() });
            toast.success("Service visit report created successfully");
        },
        onError: error => toast.error(handleQueryError(error)),
    });
};

export const useUpdateServiceVisit = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, data }: { id: number; data: UpdateServiceVisitReportDto }) => serviceVisitService.update(id, data),
        onSuccess: (_data, variables) => {
            queryClient.invalidateQueries({ queryKey: serviceVisitKeys.lists() });
            queryClient.invalidateQueries({ queryKey: serviceVisitKeys.joinedList() });
            queryClient.invalidateQueries({ queryKey: serviceVisitKeys.detail(variables.id) });
            toast.success("Service visit report updated successfully");
        },
        onError: error => toast.error(handleQueryError(error)),
    });
};

export const useDeleteServiceVisit = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id: number) => serviceVisitService.remove(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: serviceVisitKeys.lists() });
            queryClient.invalidateQueries({ queryKey: serviceVisitKeys.joinedList() });
            toast.success("Service visit report deleted successfully");
        },
        onError: error => toast.error(handleQueryError(error)),
    });
};
