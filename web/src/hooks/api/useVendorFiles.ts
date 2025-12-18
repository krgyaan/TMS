import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { vendorFilesService } from '@/services/api';
import type { CreateVendorFileDto, UpdateVendorFileDto } from '@/types/api.types';
import { handleQueryError } from '@/lib/react-query';
import { toast } from 'sonner';

export const vendorFilesKey = {
    all: ['vendorFiles'] as const,
    lists: () => [...vendorFilesKey.all, 'list'] as const,
    details: () => [...vendorFilesKey.all, 'detail'] as const,
    detail: (id: number) => [...vendorFilesKey.details(), id] as const,
    byVendor: (vendorId: number) => [...vendorFilesKey.all, 'vendor', vendorId] as const,
};

export const useVendorFiles = () => {
    return useQuery({
        queryKey: vendorFilesKey.lists(),
        queryFn: () => vendorFilesService.getAll(),
    });
};

export const useVendorFile = (id: number | null) => {
    return useQuery({
        queryKey: vendorFilesKey.detail(id!),
        queryFn: () => vendorFilesService.getById(id!),
        enabled: !!id,
    });
};

export const useVendorFilesByVendor = (vendorId: number | null) => {
    return useQuery({
        queryKey: vendorFilesKey.byVendor(vendorId!),
        queryFn: () => vendorFilesService.getByVendor(vendorId!),
        enabled: !!vendorId,
    });
};

export const useCreateVendorFile = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (data: CreateVendorFileDto) => vendorFilesService.create(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: vendorFilesKey.lists() });
            toast.success('Vendor File created successfully');
        },
        onError: (error) => {
            toast.error(handleQueryError(error));
        },
    });
};

export const useUpdateVendorFile = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ id, data }: { id: number; data: UpdateVendorFileDto }) =>
            vendorFilesService.update(id, data),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: vendorFilesKey.lists() });
            queryClient.invalidateQueries({ queryKey: vendorFilesKey.detail(variables.id) });
            toast.success('Vendor File updated successfully');
        },
        onError: (error) => {
            toast.error(handleQueryError(error));
        },
    });
};

export const useDeleteVendorFile = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (id: number) => vendorFilesService.deleteItem(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: vendorFilesKey.lists() });
            toast.success('Vendor File deleted successfully');
        },
        onError: (error) => {
            toast.error(handleQueryError(error));
        },
    });
};
