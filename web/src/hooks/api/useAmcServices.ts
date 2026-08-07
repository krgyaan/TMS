import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { amcServicesService } from "@/services/api";
import type { ServicePathField } from "@/modules/services/amc/helpers/amc.types";
import { handleQueryError } from "@/lib/react-query";
import { toast } from "sonner";

export const amcServicesKeys = {
    all: ["amc-services"] as const,
    lists: () => [...amcServicesKeys.all, "list"] as const,
    list: (amcId?: number, siteId?: number) =>
        [...amcServicesKeys.lists(), { amcId, siteId }] as const,
    details: () => [...amcServicesKeys.all, "detail"] as const,
    detail: (id: number) => [...amcServicesKeys.details(), id] as const,
};

export const useAmcServices = (amcId?: number, siteId?: number) => {
    return useQuery({
        queryKey: amcServicesKeys.list(amcId, siteId),
        queryFn: () => amcServicesService.getAll(amcId, siteId),
    });
};

export const useAmcService = (id: number) => {
    return useQuery({
        queryKey: amcServicesKeys.detail(id),
        queryFn: () => amcServicesService.getById(id),
        enabled: !!id,
    });
};

export const useAmcServiceFileUpload = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, field, file }: { id: number; field: ServicePathField; file: File }) =>
            amcServicesService.uploadFile(id, field, file),
        onSuccess: (_data, variables) => {
            queryClient.invalidateQueries({ queryKey: amcServicesKeys.lists() });
            queryClient.invalidateQueries({ queryKey: amcServicesKeys.detail(variables.id) });
            queryClient.invalidateQueries({ queryKey: ["amcs"] });
            toast.success("Service report uploaded successfully");
        },
        onError: error => toast.error(handleQueryError(error)),
    });
};
