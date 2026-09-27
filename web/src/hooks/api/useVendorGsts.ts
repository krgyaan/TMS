import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { vendorApi } from '@/services/api';
import type { CreateVendorGstDto, UpdateVendorGstDto } from '@/types/api.types';
import { handleQueryError } from '@/lib/react-query';
import { toast } from 'sonner';

export const vendorGstsKey = {
    all: ['vendorGsts'] as const,
    lists: () => [...vendorGstsKey.all, 'list'] as const,
    details: () => [...vendorGstsKey.all, 'detail'] as const,
    detail: (id: number) => [...vendorGstsKey.details(), id] as const,
    byOrganization: (orgId: number) => [...vendorGstsKey.all, 'organization', orgId] as const,
};

export const useVendorGsts = () => {
    return useQuery({
        queryKey: vendorGstsKey.lists(),
        queryFn: () => vendorApi.getAllGsts(),
    });
};

export const useVendorGst = (id: number | null) => {
    return useQuery({
        queryKey: vendorGstsKey.detail(id!),
        queryFn: () => vendorApi.getGstById(id!),
        enabled: !!id,
    });
};

export const useVendorGstsByOrganization = (orgId: number | null) => {
    return useQuery({
        queryKey: vendorGstsKey.byOrganization(orgId!),
        queryFn: () => vendorApi.getGstsByOrganization(orgId!),
        enabled: !!orgId,
    });
};

export const useCreateVendorGst = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (data: CreateVendorGstDto) => vendorApi.createGst(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: vendorGstsKey.lists() });
            toast.success('Vendor GST created successfully');
        },
        onError: (error) => {
            toast.error(handleQueryError(error));
        },
    });
};

export const useUpdateVendorGst = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ id, data }: { id: number; data: UpdateVendorGstDto }) =>
            vendorApi.updateGst(id, data),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: vendorGstsKey.lists() });
            queryClient.invalidateQueries({ queryKey: vendorGstsKey.detail(variables.id) });
            toast.success('Vendor GST updated successfully');
        },
        onError: (error) => {
            toast.error(handleQueryError(error));
        },
    });
};

export const useDeleteVendorGst = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (id: number) => vendorApi.deleteGst(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: vendorGstsKey.lists() });
            toast.success('Vendor GST deleted successfully');
        },
        onError: (error) => {
            toast.error(handleQueryError(error));
        },
    });
};
