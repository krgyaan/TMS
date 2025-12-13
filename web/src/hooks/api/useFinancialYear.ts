import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { financialYearService } from "@/services/api";
import type { CreateFinancialYearDto, UpdateFinancialYearDto } from "@/types/api.types";
import { handleQueryError } from "@/lib/react-query";
import { toast } from "sonner";

export const financialYearKey = {
    all: ["financialYear"] as const,
    lists: () => [...financialYearKey.all, "list"] as const,
    list: (filters?: any) => [...financialYearKey.lists(), { filters }] as const,
    details: () => [...financialYearKey.all, "detail"] as const,
    detail: (id: number) => [...financialYearKey.details(), id] as const,
};

// Get all financial years
export const useFinancialYears = () => {
    return useQuery({
        queryKey: financialYearKey.lists(),
        queryFn: () => financialYearService.getAll(),
    });
};

// Get financial year by ID
export const useFinancialYear = (id: number | null) => {
    return useQuery({
        queryKey: financialYearKey.detail(id!),
        queryFn: () => financialYearService.getById(id!),
        enabled: !!id,
    });
};

// Create financial year
export const useCreateFinancialYear = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (data: CreateFinancialYearDto) => financialYearService.create(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: financialYearKey.lists() });
            toast.success("Financial Year created successfully");
        },
        onError: error => {
            toast.error(handleQueryError(error));
        },
    });
};

// Update financial year
export const useUpdateFinancialYear = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ id, data }: { id: number; data: UpdateFinancialYearDto }) => financialYearService.update(id, data),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: financialYearKey.lists() });
            queryClient.invalidateQueries({ queryKey: financialYearKey.detail(variables.id) });
            toast.success("Financial Year updated successfully");
        },
        onError: error => {
            toast.error(handleQueryError(error));
        },
    });
};
