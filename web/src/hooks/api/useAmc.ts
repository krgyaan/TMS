import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { amcService } from "@/services/api";
import type { CreateAmcDto, UpdateAmcDto, AmcPathField } from "@/modules/services/amc/helpers/amc.types";
import { handleQueryError } from "@/lib/react-query";
import { toast } from "sonner";

export const amcKeys = {
    all: ["amcs"] as const,
    lists: () => [...amcKeys.all, "list"] as const,
    list: (projectId?: number) => [...amcKeys.lists(), { projectId }] as const,
    details: () => [...amcKeys.all, "detail"] as const,
    detail: (id: number) => [...amcKeys.details(), id] as const,
};

export const useAmcs = (projectId?: number) => {
    return useQuery({
        queryKey: amcKeys.list(projectId),
        queryFn: () => amcService.getAll(projectId),
    });
};

export const useAmc = (id: number) => {
    return useQuery({
        queryKey: amcKeys.detail(id),
        queryFn: () => amcService.getById(id),
        enabled: !!id,
    });
};

export const useCreateAmc = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (data: CreateAmcDto) => amcService.create(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: amcKeys.lists() });
            toast.success("AMC created successfully");
        },
        onError: error => toast.error(handleQueryError(error)),
    });
};

export const useUpdateAmc = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, data }: { id: number; data: UpdateAmcDto }) => amcService.update(id, data),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: amcKeys.lists() });
            queryClient.invalidateQueries({ queryKey: amcKeys.detail(variables.id) });
            toast.success("AMC updated successfully");
        },
        onError: error => toast.error(handleQueryError(error)),
    });
};

export const useDeleteAmc = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id: number) => amcService.remove(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: amcKeys.lists() });
            toast.success("AMC deleted successfully");
        },
        onError: error => toast.error(handleQueryError(error)),
    });
};

export const useAmcFileUpload = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, field, file }: { id: number; field: AmcPathField; file: File }) =>
            amcService.uploadFile(id, field, file),
        onSuccess: (_data, variables) => {
            queryClient.invalidateQueries({ queryKey: amcKeys.detail(variables.id) });
        },
        onError: error => toast.error(handleQueryError(error)),
    });
};