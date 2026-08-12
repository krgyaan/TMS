import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { customerService } from "@/services/api";
import type { AllotEngineerDto, CreateCustomerComplaintDto, UpdateCustomerComplaintDto } from "@/modules/services/customer/helpers/customer.types";
import { handleQueryError } from "@/lib/react-query";
import { toast } from "sonner";

export const customerKeys = {
    all: ["customer-complaints"] as const,
    lists: () => [...customerKeys.all, "list"] as const,
    list: (search?: string) => [...customerKeys.lists(), { search }] as const,
    details: () => [...customerKeys.all, "detail"] as const,
    detail: (id: number) => [...customerKeys.details(), id] as const,
};

export const useCustomers = (search?: string, enabled = true) => {
    return useQuery({
        queryKey: customerKeys.list(search),
        queryFn: () => customerService.getAll(search),
        enabled,
    });
};

export const useCustomer = (id: number) => {
    return useQuery({
        queryKey: customerKeys.detail(id),
        queryFn: () => customerService.getById(id),
        enabled: !!id,
    });
};

export const useCreateCustomer = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (data: CreateCustomerComplaintDto) => customerService.create(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: customerKeys.lists() });
            toast.success("Customer complaint created successfully");
        },
        onError: error => toast.error(handleQueryError(error)),
    });
};

export const useUpdateCustomer = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, data }: { id: number; data: UpdateCustomerComplaintDto }) =>
            customerService.update(id, data),
        onSuccess: (_data, variables) => {
            queryClient.invalidateQueries({ queryKey: customerKeys.lists() });
            queryClient.invalidateQueries({ queryKey: customerKeys.detail(variables.id) });
            toast.success("Customer complaint updated successfully");
        },
        onError: error => toast.error(handleQueryError(error)),
    });
};

export const useDeleteCustomer = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id: number) => customerService.remove(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: customerKeys.lists() });
            toast.success("Customer complaint deleted successfully");
        },
        onError: error => toast.error(handleQueryError(error)),
    });
};

export const useAllotEngineer = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, data }: { id: number; data: AllotEngineerDto }) =>
            customerService.allotEngineer(id, data),
        onSuccess: (_data, variables) => {
            queryClient.invalidateQueries({ queryKey: customerKeys.lists() });
            queryClient.invalidateQueries({ queryKey: customerKeys.detail(variables.id) });
            toast.success("Engineer allotted successfully");
        },
        onError: error => toast.error(handleQueryError(error)),
    });
};

export const useUpdateEngineer = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, engineerId, data }: { id: number; engineerId: number; data: AllotEngineerDto }) =>
            customerService.updateEngineer(id, engineerId, data),
        onSuccess: (_data, variables) => {
            queryClient.invalidateQueries({ queryKey: customerKeys.lists() });
            queryClient.invalidateQueries({ queryKey: customerKeys.detail(variables.id) });
            toast.success("Engineer updated successfully");
        },
        onError: error => toast.error(handleQueryError(error)),
    });
};
