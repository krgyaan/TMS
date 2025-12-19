import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { vendorAccountsService } from '@/services/api';
import type { CreateVendorAccountDto, UpdateVendorAccountDto } from '@/types/api.types';
import { handleQueryError } from '@/lib/react-query';
import { toast } from 'sonner';

export const vendorAccountsKey = {
    all: ['vendorAccounts'] as const,
    lists: () => [...vendorAccountsKey.all, 'list'] as const,
    details: () => [...vendorAccountsKey.all, 'detail'] as const,
    detail: (id: number) => [...vendorAccountsKey.details(), id] as const,
    byOrganization: (orgId: number) => [...vendorAccountsKey.all, 'organization', orgId] as const,
};

export const useVendorAccounts = () => {
    return useQuery({
        queryKey: vendorAccountsKey.lists(),
        queryFn: () => vendorAccountsService.getAll(),
    });
};

export const useVendorAccount = (id: number | null) => {
    return useQuery({
        queryKey: vendorAccountsKey.detail(id!),
        queryFn: () => vendorAccountsService.getById(id!),
        enabled: !!id,
    });
};

export const useVendorAccountsByOrganization = (orgId: number | null) => {
    return useQuery({
        queryKey: vendorAccountsKey.byOrganization(orgId!),
        queryFn: () => vendorAccountsService.getByOrganization(orgId!),
        enabled: !!orgId,
    });
};

export const useCreateVendorAccount = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (data: CreateVendorAccountDto) => vendorAccountsService.create(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: vendorAccountsKey.lists() });
            toast.success('Vendor Account created successfully');
        },
        onError: (error) => {
            toast.error(handleQueryError(error));
        },
    });
};

export const useUpdateVendorAccount = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ id, data }: { id: number; data: UpdateVendorAccountDto }) =>
            vendorAccountsService.update(id, data),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: vendorAccountsKey.lists() });
            queryClient.invalidateQueries({ queryKey: vendorAccountsKey.detail(variables.id) });
            toast.success('Vendor Account updated successfully');
        },
        onError: (error) => {
            toast.error(handleQueryError(error));
        },
    });
};

export const useDeleteVendorAccount = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (id: number) => vendorAccountsService.deleteItem(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: vendorAccountsKey.lists() });
            toast.success('Vendor Account deleted successfully');
        },
        onError: (error) => {
            toast.error(handleQueryError(error));
        },
    });
};
