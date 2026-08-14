import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { insuranceService } from '@/services/api/insurance.service';
import type { InsuranceCreatePayload, InsurancePolicyDetail, InsurancePolicyRow } from '@/modules/insurance/helpers/insurance.types';
import type { PaginatedResult } from '@/types/api.types';
import { toast } from 'sonner';
import { handleQueryError } from '@/lib/react-query';

export const insurancePolicyKeys = {
    all: ['insurance-policies'] as const,
    lists: () => [...insurancePolicyKeys.all, 'list'] as const,
    list: (filters?: Record<string, unknown>) => [...insurancePolicyKeys.lists(), { filters }] as const,
    detail: (id: number) => [...insurancePolicyKeys.all, 'detail', id] as const,
};

export const useInsurancePolicies = (
    pagination: { page: number; limit: number; search?: string } = { page: 1, limit: 50 },
    filters?: { status?: string; insuranceType?: string }
) => {
    return useQuery<PaginatedResult<InsurancePolicyRow>>({
        queryKey: insurancePolicyKeys.list({
            page: pagination.page,
            limit: pagination.limit,
            search: pagination.search ?? undefined,
            status: filters?.status,
            insuranceType: filters?.insuranceType,
        }),
        queryFn: () => insuranceService.getAll({ ...pagination, ...filters }),
        placeholderData: (previousData) =>
            previousData && typeof previousData === 'object' && 'data' in previousData && 'meta' in previousData
                ? previousData
                : undefined,
    });
};

export const useInsurancePolicy = (id: number) => {
    return useQuery<InsurancePolicyDetail>({
        queryKey: insurancePolicyKeys.detail(id),
        queryFn: () => insuranceService.getById(id),
        enabled: !!id,
    });
};

export const useCreateInsurancePolicy = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (data: InsuranceCreatePayload) => insuranceService.create(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: insurancePolicyKeys.all });
            toast.success('Insurance policy created successfully');
        },
        onError: handleQueryError,
    });
};

export const useUpdateInsurancePolicy = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, data }: { id: number; data: Partial<InsuranceCreatePayload> }) =>
            insuranceService.update(id, data),
        onSuccess: (_, { id }) => {
            queryClient.invalidateQueries({ queryKey: insurancePolicyKeys.all });
            queryClient.invalidateQueries({ queryKey: insurancePolicyKeys.detail(id) });
            toast.success('Insurance policy updated successfully');
        },
        onError: handleQueryError,
    });
};

export const useDeleteInsurancePolicy = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id: number) => insuranceService.remove(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: insurancePolicyKeys.all });
            toast.success('Insurance policy deleted successfully');
        },
        onError: handleQueryError,
    });
};