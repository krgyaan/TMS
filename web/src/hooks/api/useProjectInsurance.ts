import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { insuranceService } from "@/services/api/insurance.service";
import { paymentRequestApi } from "@/services/api/payment-request.api";
import type { InsuranceCreatePayload, InsurancePolicyRow } from "@/modules/insurance/helpers/insurance.types";

export function useProjectInsurancePolicies(projectId: number) {
    return useQuery<InsurancePolicyRow[]>({
        queryKey: ["insurance-policies", "project", projectId],
        queryFn: () => insuranceService.getByProject(projectId),
        enabled: !!projectId,
    });
}

export function useCreateProjectInsurance() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (data: Record<string, unknown>) => paymentRequestApi.create(data),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ["insurance-policies"] });
            queryClient.invalidateQueries({ queryKey: ["payment-requests"] });
            queryClient.invalidateQueries({ queryKey: ["payment-requests", "project", variables?.projectId] });
        },
    });
}

export function useCreateDirectInsurance() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (data: InsuranceCreatePayload) => insuranceService.create(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["insurance-policies"] });
        },
    });
}