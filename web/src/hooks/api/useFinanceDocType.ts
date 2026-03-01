import { useQuery } from "@tanstack/react-query";
import { financeDocTypeService } from "@/services/api";

export const financeDocTypeKey = {
    all: ["financeDocType"] as const,
    lists: () => [...financeDocTypeKey.all, "list"] as const,
    list: (filters?: any) => [...financeDocTypeKey.lists(), { filters }] as const,
    details: () => [...financeDocTypeKey.all, "detail"] as const,
    detail: (id: number) => [...financeDocTypeKey.details(), id] as const,
};

export const useFinanceDocTypes = () => {
    return useQuery({
        queryKey: financeDocTypeKey.lists(),
        queryFn: () => financeDocTypeService.getAll(),
    });
};

export const useFinanceDocType = (id: number | null) => {
    return useQuery({
        queryKey: financeDocTypeKey.detail(id!),
        queryFn: () => financeDocTypeService.getById(id!),
        enabled: !!id,
    });
};
