import { inventoryApi } from '@/services/api/inventory.api';
import type { InventoryProjectSummary, InventoryProjectSummaryFilters, InventoryWarehouseFilter } from '@/modules/operations/inventory/helpers/inventory.types';
import type { PaginatedResult } from "@/types/api.types";
import { useQuery } from '@tanstack/react-query';

export const inventoryKeys = {
    all: ['inventory'] as const,
    projectInventory: (projectId: number, includeZero: boolean, warehouseType: InventoryWarehouseFilter) =>
        [...inventoryKeys.all, 'project', projectId, includeZero, warehouseType] as const,
    allInventory: (includeZero: boolean) => [...inventoryKeys.all, 'all', includeZero] as const,
    projectSummaries: (filters?: InventoryProjectSummaryFilters) => [...inventoryKeys.all, 'projects', { filters }] as const,
};

export const useProjectInventory = (projectId: number | null, includeZero = false, warehouseType: InventoryWarehouseFilter = "all") => {
    return useQuery({
        queryKey: inventoryKeys.projectInventory(projectId ?? 0, includeZero, warehouseType),
        queryFn: () => inventoryApi.getProjectInventory(projectId!, includeZero, warehouseType),
        enabled: !!projectId,
    });
};

export const useAllInventory = (includeZero = false) => {
    return useQuery({
        queryKey: inventoryKeys.allInventory(includeZero),
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