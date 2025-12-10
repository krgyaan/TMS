import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { organizationsService } from "@/services";
import type { CreateOrganizationDto, UpdateOrganizationDto } from "@/types/api.types";
import { handleQueryError } from "@/lib/react-query";
import { toast } from "sonner";

export const organizationsKey = {
    all: ["organizations"] as const,
    lists: () => [...organizationsKey.all, "list"] as const,
    list: (filters?: any) => [...organizationsKey.lists(), { filters }] as const,
    details: () => [...organizationsKey.all, "detail"] as const,
    detail: (id: number) => [...organizationsKey.details(), id] as const,
};

export const useOrganizations = () => {
    return useQuery({
        queryKey: organizationsKey.lists(),
        queryFn: () => organizationsService.getAll(),
    });
};

export const useOrganization = (id: number | null) => {
    return useQuery({
        queryKey: organizationsKey.detail(id!),
        queryFn: () => organizationsService.getById(id!),
        enabled: !!id,
    });
};

export const useOrganizationSearch = (query: string) => {
    return useQuery({
        queryKey: [...organizationsKey.all, "search", query],
        enabled: query.length > 0,
    });
};

export const useOrganizationsByIndustry = (industryId: number | null) => {
    return useQuery({
        queryKey: [...organizationsKey.all, "industry", industryId],
        queryFn: () => organizationsService.getByIndustry(industryId!),
        enabled: !!industryId,
    });
};

export const useCreateOrganization = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (data: CreateOrganizationDto) => organizationsService.create(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: organizationsKey.lists() });
            toast.success("Organization created successfully");
        },
        onError: error => {
            toast.error(handleQueryError(error));
        },
    });
};

export const useUpdateOrganization = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ id, data }: { id: number; data: UpdateOrganizationDto }) => organizationsService.update(id, data),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: organizationsKey.lists() });
            queryClient.invalidateQueries({ queryKey: organizationsKey.detail(variables.id) });
            toast.success("Organization updated successfully");
        },
        onError: error => {
            toast.error(handleQueryError(error));
        },
    });
};

export const useDeleteOrganization = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (id: number) => organizationsService.deleteOrganization(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: organizationsKey.lists() });
            toast.success("Organization deleted successfully");
        },
        onError: error => {
            toast.error(handleQueryError(error));
        },
    });
};
