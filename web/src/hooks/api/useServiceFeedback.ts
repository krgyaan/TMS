import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { serviceFeedbackService } from "@/services/api";
import type { CreateServiceFeedbackDto, UpdateServiceFeedbackDto } from "@/modules/services/service-feedback/helpers/service-feedback.types";
import { handleQueryError } from "@/lib/react-query";
import { toast } from "sonner";

export const serviceFeedbackKeys = {
    all: ["service-feedback"] as const,
    lists: () => [...serviceFeedbackKeys.all, "list"] as const,
    list: (complaintId?: number) => [...serviceFeedbackKeys.lists(), { complaintId }] as const,
    joinedList: () => [...serviceFeedbackKeys.all, "joined-list"] as const,
    details: () => [...serviceFeedbackKeys.all, "detail"] as const,
    detail: (id: number) => [...serviceFeedbackKeys.details(), id] as const,
};

export const useServiceFeedbacks = (complaintId?: number) => {
    return useQuery({
        queryKey: serviceFeedbackKeys.list(complaintId),
        queryFn: () => serviceFeedbackService.getAll(complaintId),
    });
};

export const useServiceFeedbackList = () => {
    return useQuery({
        queryKey: serviceFeedbackKeys.joinedList(),
        queryFn: () => serviceFeedbackService.getList(),
    });
};

export const useServiceFeedback = (id: number) => {
    return useQuery({
        queryKey: serviceFeedbackKeys.detail(id),
        queryFn: () => serviceFeedbackService.getById(id),
        enabled: !!id,
    });
};

export const useServiceFeedbackByComplaint = (complaintId: number) => {
    return useQuery({
        queryKey: [...serviceFeedbackKeys.all, "by-complaint", complaintId],
        queryFn: () => serviceFeedbackService.getByComplaintId(complaintId),
        enabled: !!complaintId,
    });
};

export const useCreateServiceFeedback = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (data: CreateServiceFeedbackDto) => serviceFeedbackService.create(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: serviceFeedbackKeys.lists() });
            queryClient.invalidateQueries({ queryKey: serviceFeedbackKeys.joinedList() });
            toast.success("Service feedback created successfully");
        },
        onError: error => toast.error(handleQueryError(error)),
    });
};

export const useUpdateServiceFeedback = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, data }: { id: number; data: UpdateServiceFeedbackDto }) => serviceFeedbackService.update(id, data),
        onSuccess: (_data, variables) => {
            queryClient.invalidateQueries({ queryKey: serviceFeedbackKeys.lists() });
            queryClient.invalidateQueries({ queryKey: serviceFeedbackKeys.joinedList() });
            queryClient.invalidateQueries({ queryKey: serviceFeedbackKeys.detail(variables.id) });
            toast.success("Service feedback updated successfully");
        },
        onError: error => toast.error(handleQueryError(error)),
    });
};

export const useDeleteServiceFeedback = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id: number) => serviceFeedbackService.remove(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: serviceFeedbackKeys.lists() });
            queryClient.invalidateQueries({ queryKey: serviceFeedbackKeys.joinedList() });
            toast.success("Service feedback deleted successfully");
        },
        onError: error => toast.error(handleQueryError(error)),
    });
};
