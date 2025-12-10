import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { tenderInfosService } from "@/services/api";
import { handleQueryError } from "@/lib/react-query";
import { toast } from "sonner";
import { useTeamFilter } from "@/hooks/useTeamFilter";
import type { CreateTenderRequest, UpdateTenderRequest } from "@/types/api.types";

export const tendersKey = {
    all: ["tenders"] as const,
    lists: () => [...tendersKey.all, "list"] as const,
    list: (filters?: Record<string, unknown>) => [...tendersKey.lists(), { filters }] as const,
    details: () => [...tendersKey.all, "detail"] as const,
    detail: (id: number) => [...tendersKey.details(), id] as const,
};

export const useTenders = (activeTab?: string, statusIds: number[] = []) => {
    const { queryParams: teamParams, teamId, userId, dataScope } = useTeamFilter();

    // Build combined filters
    const filters = {
        ...(activeTab === "unallocated" ? { unallocated: true } : {}),
        ...(activeTab !== "unallocated" && statusIds.length > 0 ? { statusIds } : {}),
        ...teamParams,
    };

    // Include team filter in query key for proper cache isolation
    const queryKeyFilters = {
        activeTab,
        statusIds,
        teamId,
        userId,
        dataScope,
    };

    return useQuery({
        queryKey: tendersKey.list(queryKeyFilters),
        queryFn: () => tenderInfosService.getAll(filters),
    });
};

export const useTender = (id: number | null) => {
    return useQuery({
        queryKey: id ? tendersKey.detail(id) : tendersKey.detail(0),
        queryFn: () => tenderInfosService.getById(id!),
        enabled: !!id,
    });
};

export const useCreateTender = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (data: CreateTenderRequest) => tenderInfosService.create(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: tendersKey.lists() });
            toast.success("Tender created successfully");
        },
        onError: error => {
            toast.error(handleQueryError(error));
        },
    });
};

export const useUpdateTender = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ id, data }: { id: number; data: UpdateTenderRequest }) => tenderInfosService.update(id, data),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: tendersKey.lists() });
            queryClient.invalidateQueries({ queryKey: tendersKey.detail(variables.id) });
            toast.success("Tender updated successfully");
        },
        onError: error => {
            toast.error(handleQueryError(error));
        },
    });
};

export const useDeleteTender = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (id: number) => tenderInfosService.remove(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: tendersKey.lists() });
            toast.success("Tender deleted successfully");
        },
        onError: error => {
            toast.error(handleQueryError(error));
        },
    });
};
