import { inventoryApi } from '@/services/api/inventory.api';
import type { TransferDTO, InventoryProjectSummary, InventoryProjectSummaryFilters } from '@/modules/operations/inventory/helpers/inventory.types';
import type { PaginatedResult } from "@/types/api.types";
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

export const inventoryKeys = {
    all: ['inventory'] as const,
    projectInventory: (projectId: number) => [...inventoryKeys.all, 'project', projectId] as const,
    allInventory: () => [...inventoryKeys.all, 'all'] as const,
    projectSummaries: (filters?: InventoryProjectSummaryFilters) => [...inventoryKeys.all, 'projects', { filters }] as const,
    transfers: (fromProject?: number, toProject?: number) =>
        [...inventoryKeys.all, 'transfers', fromProject, toProject] as const,
};

export const useProjectInventory = (projectId: number | null, includeZero = false) => {
    return useQuery({
        queryKey: inventoryKeys.projectInventory(projectId ?? 0),
        queryFn: () => inventoryApi.getProjectInventory(projectId!, includeZero),
        enabled: !!projectId,
    });
};

export const useAllInventory = (includeZero = false) => {
    return useQuery({
        queryKey: [...inventoryKeys.allInventory(), includeZero],
        queryFn: () => inventoryApi.getAllInventory(includeZero),
    });
};

export const useInventoryProjectSummaries = (filters?: InventoryProjectSummaryFilters) => {
    return useQuery<PaginatedResult<InventoryProjectSummary>>({
        queryKey: inventoryKeys.projectSummaries(filters),
        queryFn: () => inventoryApi.getProjectSummaries(filters),
        placeholderData: previousData => {
            if (
                previousData &&
                typeof previousData === "object" &&
                "data" in previousData &&
                "meta" in previousData
            ) {
                return previousData;
            }
            return undefined;
        },
    });
};

export const useTransfers = (fromProject?: number, toProject?: number) => {
    return useQuery({
        queryKey: inventoryKeys.transfers(fromProject, toProject),
        queryFn: () => inventoryApi.getTransfers(fromProject, toProject),
    });
};

export const useCreateTransfer = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (data: TransferDTO) => inventoryApi.transfer(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: inventoryKeys.all });
        },
    });
};
