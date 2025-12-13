import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { emdResponsibilityService } from "@/services/api";
import type { CreateEmdResponsibilityDto, UpdateEmdResponsibilityDto } from "@/types/api.types";
import { handleQueryError } from "@/lib/react-query";
import { toast } from "sonner";

export const emdResponsibilityKey = {
    all: ["emdResponsibility"] as const,
    lists: () => [...emdResponsibilityKey.all, "list"] as const,
    list: (filters?: any) => [...emdResponsibilityKey.lists(), { filters }] as const,
    details: () => [...emdResponsibilityKey.all, "detail"] as const,
    detail: (id: number) => [...emdResponsibilityKey.details(), id] as const,
};

// Get all EMD responsibilities
export const useEmdResponsibilities = () => {
    return useQuery({
        queryKey: emdResponsibilityKey.lists(),
        queryFn: () => emdResponsibilityService.getAll(),
    });
};

// Get EMD responsibility by ID
export const useEmdResponsibility = (id: number | null) => {
    return useQuery({
        queryKey: emdResponsibilityKey.detail(id!),
        queryFn: () => emdResponsibilityService.getById(id!),
        enabled: !!id,
    });
};

// Create EMD responsibility
export const useCreateEmdResponsibility = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (data: CreateEmdResponsibilityDto) => emdResponsibilityService.create(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: emdResponsibilityKey.lists() });
            toast.success("EMD Responsibility created successfully");
        },
        onError: error => {
            toast.error(handleQueryError(error));
        },
    });
};

// Update EMD responsibility
export const useUpdateEmdResponsibility = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ id, data }: { id: number; data: UpdateEmdResponsibilityDto }) => emdResponsibilityService.update(id, data),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: emdResponsibilityKey.lists() });
            queryClient.invalidateQueries({ queryKey: emdResponsibilityKey.detail(variables.id) });
            toast.success("EMD Responsibility updated successfully");
        },
        onError: error => {
            toast.error(handleQueryError(error));
        },
    });
};
