import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { conferenceService } from "@/services/api";
import type { CreateConferenceCallReportDto, UpdateConferenceCallReportDto } from "@/modules/services/conference/helpers/conference.types";
import { handleQueryError } from "@/lib/react-query";
import { toast } from "sonner";

export const conferenceKeys = {
    all: ["conference-call-reports"] as const,
    lists: () => [...conferenceKeys.all, "list"] as const,
    list: (complaintId?: number) => [...conferenceKeys.lists(), { complaintId }] as const,
    joinedList: () => [...conferenceKeys.all, "joined-list"] as const,
    details: () => [...conferenceKeys.all, "detail"] as const,
    detail: (id: number) => [...conferenceKeys.details(), id] as const,
};

export const useConferences = (complaintId?: number) => {
    return useQuery({
        queryKey: conferenceKeys.list(complaintId),
        queryFn: () => conferenceService.getAll(complaintId),
    });
};

export const useConferenceList = () => {
    return useQuery({
        queryKey: conferenceKeys.joinedList(),
        queryFn: () => conferenceService.getList(),
    });
};

export const useConference = (id: number) => {
    return useQuery({
        queryKey: conferenceKeys.detail(id),
        queryFn: () => conferenceService.getById(id),
        enabled: !!id,
    });
};

export const useConferenceByComplaint = (complaintId: number) => {
    return useQuery({
        queryKey: [...conferenceKeys.all, "by-complaint", complaintId],
        queryFn: () => conferenceService.getByComplaintId(complaintId),
        enabled: !!complaintId,
    });
};

export const useCreateConference = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (data: CreateConferenceCallReportDto) => conferenceService.create(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: conferenceKeys.lists() });
            queryClient.invalidateQueries({ queryKey: conferenceKeys.joinedList() });
            toast.success("Conference call report created successfully");
        },
        onError: error => toast.error(handleQueryError(error)),
    });
};

export const useUpdateConference = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, data }: { id: number; data: UpdateConferenceCallReportDto }) => conferenceService.update(id, data),
        onSuccess: (_data, variables) => {
            queryClient.invalidateQueries({ queryKey: conferenceKeys.lists() });
            queryClient.invalidateQueries({ queryKey: conferenceKeys.joinedList() });
            queryClient.invalidateQueries({ queryKey: conferenceKeys.detail(variables.id) });
            toast.success("Conference call report updated successfully");
        },
        onError: error => toast.error(handleQueryError(error)),
    });
};

export const useDeleteConference = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id: number) => conferenceService.remove(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: conferenceKeys.lists() });
            queryClient.invalidateQueries({ queryKey: conferenceKeys.joinedList() });
            toast.success("Conference call report deleted successfully");
        },
        onError: error => toast.error(handleQueryError(error)),
    });
};
