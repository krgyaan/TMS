import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { tenderInfosService } from "@/services";
import { handleQueryError } from "@/lib/react-query";
import { toast } from "sonner";
import type { CreateTenderInfoDto, UpdateTenderInfoDto } from "@/types/api.types";

export const tendersKey = {
    all: ["tenders"] as const,
    lists: () => [...tendersKey.all, "list"] as const,
    list: (filters?: any) => [...tendersKey.lists(), { filters }] as const,
    details: () => [...tendersKey.all, "detail"] as const,
    detail: (id: number) => [...tendersKey.details(), id] as const,
};

export const useTenders = (activeTab?: string, statusIds: number[] = []) => {
    const filters = activeTab === "unallocated" ? { unallocated: true } : { statusIds };

    return useQuery({
        queryKey: tendersKey.list(filters),
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
        mutationFn: (data: CreateTenderInfoDto) => tenderInfosService.create(data),
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
        mutationFn: ({ id, data }: { id: number; data: UpdateTenderInfoDto }) => tenderInfosService.update(id, data),
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
