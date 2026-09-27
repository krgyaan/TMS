import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { vendorApi } from "@/services/api";
import type {
    CreateVendorOrganizationDto,
    UpdateVendorOrganizationDto,
    CreateVendorOrganizationWithRelationsDto,
    UpdateVendorOrganizationWithRelationsDto,
} from "@/types/api.types";
import { handleQueryError } from "@/lib/react-query";
import { toast } from "sonner";

export const vendorOrganizationsKey = {
    all: ["vendorOrganizations"] as const,
    lists: () => [...vendorOrganizationsKey.all, "list"] as const,
    withRelations: () => [...vendorOrganizationsKey.all, "withRelations"] as const,
    details: () => [...vendorOrganizationsKey.all, "detail"] as const,
    detail: (id: number) => [...vendorOrganizationsKey.details(), id] as const,
};

export const useVendorOrganizations = () => {
    return useQuery({
        queryKey: vendorOrganizationsKey.lists(),
        queryFn: () => vendorApi.getAllOrganizations(),
    });
};

export const useVendorOrganizationsWithRelations = () => {
    return useQuery({
        queryKey: vendorOrganizationsKey.withRelations(),
        queryFn: () => vendorApi.getAllOrganizationsWithRelations(),
    });
};

export const useVendorOrganization = (id: number | null) => {
    return useQuery({
        queryKey: vendorOrganizationsKey.detail(id!),
        queryFn: () => vendorApi.getOrganizationById(id!),
        enabled: !!id,
    });
};

export const useVendorOrganizationWithRelations = (id: number | null) => {
    return useQuery({
        queryKey: [...vendorOrganizationsKey.detail(id!), 'withRelations'],
        queryFn: () => vendorApi.getOrganizationByIdWithRelations(id!),
        enabled: !!id,
    });
};

export const useCreateVendorOrganization = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (data: CreateVendorOrganizationDto) => vendorApi.createOrganization(data),
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: vendorOrganizationsKey.lists(),
            });
            queryClient.invalidateQueries({
                queryKey: vendorOrganizationsKey.withRelations(),
            });
            toast.success("Vendor Organization created successfully");
        },
        onError: error => {
            toast.error(handleQueryError(error));
        },
    });
};

export const useUpdateVendorOrganization = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ id, data }: { id: number; data: UpdateVendorOrganizationDto }) => vendorApi.updateOrganization(id, data),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({
                queryKey: vendorOrganizationsKey.lists(),
            });
            queryClient.invalidateQueries({
                queryKey: vendorOrganizationsKey.withRelations(),
            });
            queryClient.invalidateQueries({
                queryKey: vendorOrganizationsKey.detail(variables.id),
            });
            toast.success("Vendor Organization updated successfully");
        },
        onError: error => {
            toast.error(handleQueryError(error));
        },
    });
};

export const useSetVendorOrganizationStatus = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ id, status }: { id: number; status: boolean }) => vendorApi.updateOrganization(id, { status }),
        onSuccess: (_, { status }) => {
            queryClient.invalidateQueries({
                queryKey: vendorOrganizationsKey.all,
            });
            toast.success(status ? "Vendor Organization activated" : "Vendor Organization deactivated");
        },
        onError: error => {
            toast.error(handleQueryError(error));
        },
    });
};

export const useCreateVendorOrganizationWithRelations = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (data: CreateVendorOrganizationWithRelationsDto) =>
            vendorApi.createOrganizationWithRelations(data),
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: vendorOrganizationsKey.lists(),
            });
            queryClient.invalidateQueries({
                queryKey: vendorOrganizationsKey.withRelations(),
            });
            toast.success('Vendor Organization with relations created successfully');
        },
        onError: (error) => {
            toast.error(handleQueryError(error));
        },
    });
};

export const useUpdateVendorOrganizationWithRelations = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({
            id,
            data,
        }: {
            id: number;
            data: UpdateVendorOrganizationWithRelationsDto;
        }) => vendorApi.updateOrganizationWithRelations(id, data),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({
                queryKey: vendorOrganizationsKey.lists(),
            });
            queryClient.invalidateQueries({
                queryKey: vendorOrganizationsKey.withRelations(),
            });
            queryClient.invalidateQueries({
                queryKey: vendorOrganizationsKey.detail(variables.id),
            });
            toast.success('Vendor Organization with relations updated successfully');
        },
        onError: (error) => {
            toast.error(handleQueryError(error));
        },
    });
};

// export const useDeleteVendorOrganization = () => {
//   const queryClient = useQueryClient();

//   return useMutation({
//     mutationFn: (id: number) => vendorApi.deleteOrganization(id),
//     onSuccess: () => {
//       queryClient.invalidateQueries({
//         queryKey: vendorOrganizationsKey.lists(),
//       });
//       queryClient.invalidateQueries({
//         queryKey: vendorOrganizationsKey.withRelations(),
//       });
//       toast.success('Vendor Organization deleted successfully');
//     },
//     onError: (error) => {
//       toast.error(handleQueryError(error));
//     },
//   });
// };
