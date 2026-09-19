import { useQuery } from "@tanstack/react-query";
import { cashFlowApi } from "@/services/api/cash-flow.api";

export function useProjectCashFlows(projectId: number) {
    return useQuery({
        queryKey: ["cash-flows", "project", projectId],
        queryFn: () => cashFlowApi.getByProject(projectId),
        enabled: !!projectId,
    });
}

export function useProjectCashFlowSummary(projectId: number) {
    return useQuery({
        queryKey: ["cash-flows", "summary", projectId],
        queryFn: () => cashFlowApi.getSummary(projectId),
        enabled: !!projectId,
    });
}