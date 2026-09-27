import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { vendorApi } from "@/services/api";
import type { CreateVendorDto, UpdateVendorDto } from "@/types/api.types";
import { handleQueryError } from "@/lib/react-query";
import { toast } from "sonner";

export const vendorsKey = {
    all: ["vendors"] as const,
    lists: () => [...vendorsKey.all, "list"] as const,
    list: (filters?: any) => [...vendorsKey.lists(), { filters }] as const,
    details: () => [...vendorsKey.all, "detail"] as const,
    detail: (id: number) => [...vendorsKey.details(), id] as const,
    withRelations: (id: number) => [...vendorsKey.detail(id), "relations"] as const,
};

export const useVendors = () => {
    return useQuery({
        queryKey: vendorsKey.lists(),
        queryFn: () => vendorApi.getAllVendors(),
    });
};

export const useVendor = (id: number | null) => {
    return useQuery({
        queryKey: vendorsKey.detail(id!),
        queryFn: () => vendorApi.getVendorById(id!),
        enabled: !!id,
    });
};

export const useVendorWithRelations = (id: number | null) => {
    return useQuery({
        queryKey: vendorsKey.withRelations(id!),
        queryFn: () => vendorApi.getVendorByIdWithRelations(id!),
        enabled: !!id,
    });
};

export const useVendorsByOrganization = (organizationId: number | null) => {
    return useQuery({
        queryKey: [...vendorsKey.all, "organization", organizationId],
        queryFn: () => vendorApi.getVendorsByOrganization(organizationId!),
        enabled: !!organizationId,
    });
};

export const useCreateVendor = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (data: CreateVendorDto) => vendorApi.createVendor(data),

        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: vendorsKey.lists() });

            queryClient.invalidateQueries({
                queryKey: ["vendors", "organization", variables.organizationId],
            });

            toast.success("Vendor created successfully");
        },

        onError: error => {
            toast.error(handleQueryError(error));
        },
    });
};

export const useUpdateVendor = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ id, data }: { id: number; data: UpdateVendorDto }) => vendorApi.updateVendor(id, data),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: vendorsKey.lists() });

            queryClient.invalidateQueries({
                queryKey: vendorsKey.detail(variables.id),
            });

            toast.success("Vendor updated successfully");
        },
        onError: error => {
            toast.error(handleQueryError(error));
        },
    });
};

export const useDeleteVendor = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (id: number) => vendorApi.deleteVendor(id),

        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: vendorsKey.all });

            toast.success("Vendor deleted successfully");
        },

        onError: error => {
            toast.error(handleQueryError(error));
        },
    });
};
