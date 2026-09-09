import { inventoryApi } from '@/services/api/inventory.api';
import type { TransferDTO } from '@/modules/operations/inventory/helpers/inventory.types';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

export const inventoryKeys = {
    all: ['inventory'] as const,
    projectInventory: (projectId: number) => [...inventoryKeys.all, 'project', projectId] as const,
    allInventory: () => [...inventoryKeys.all, 'all'] as const,
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
