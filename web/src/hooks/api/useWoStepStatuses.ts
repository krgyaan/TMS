import type { StepConfig, StepStatus } from '@/components/layout/ShowPageLayout';
import { woDetailsService } from '@/services/api/wo-details.api';
import { useQuery } from '@tanstack/react-query';
import { useWoDetailByBasicDetail, woDetailsKeys } from './useWoDetails';

function deriveStatus(hasData: boolean, isLoading: boolean): StepStatus {
    if (isLoading) return "loading";
    if (hasData) return "completed";
    return "pending";
}

export function useWoStepStatuses(woDetailId?: number | null, woBasicDetailId?: number | null) {
    const { data: woDetailLookup, isLoading: isLookupLoading } = useWoDetailByBasicDetail(woBasicDetailId ?? 0);

    const resolvedWoDetailId = woDetailId ?? woDetailLookup?.id ?? null;

    const { data: stepStatuses, isLoading: isStatusesLoading } = useQuery({
        queryKey: [...woDetailsKeys.all, 'step-statuses', resolvedWoDetailId],
        queryFn: () => woDetailsService.getStepStatuses(resolvedWoDetailId!),
        enabled: !!resolvedWoDetailId,
    });

    const isLoading = isLookupLoading || isStatusesLoading;

    const steps: StepConfig[] = [
        {
            id: "basic-details",
            label: "Basic Details",
            shortLabel: "Basic Details",
            stepNumber: 1,
            hasData: stepStatuses ? stepStatuses['basic-details'] : false,
            isLoading: isLoading,
            status: deriveStatus(stepStatuses ? stepStatuses['basic-details'] : false, isLoading),
        },
        {
            id: "wo-details",
            label: "WO Details",
            shortLabel: "WO Details",
            stepNumber: 2,
            hasData: stepStatuses ? stepStatuses['wo-details'] : false,
            isLoading: isLoading,
            status: deriveStatus(stepStatuses ? stepStatuses['wo-details'] : false, isLoading),
        },
        {
            id: "kick-off",
            label: "Kick-off Meeting",
            shortLabel: "Kick-off",
            stepNumber: 3,
            hasData: stepStatuses ? stepStatuses['kick-off'] : false,
            isLoading: isLoading,
            status: deriveStatus(stepStatuses ? stepStatuses['kick-off'] : false, isLoading),
        },
        {
            id: "contract-agreement",
            label: "Contract Agreement",
            shortLabel: "Contract",
            stepNumber: 4,
            hasData: stepStatuses ? stepStatuses['contract-agreement'] : false,
            isLoading: isLoading,
            status: deriveStatus(stepStatuses ? stepStatuses['contract-agreement'] : false, isLoading),
        },
        {
            id: "po-dashboard",
            label: "Purchase Orders",
            shortLabel: "POs",
            stepNumber: 5,
            hasData: stepStatuses ? stepStatuses['po-dashboard'] : false,
            isLoading: isLoading,
            status: deriveStatus(stepStatuses ? stepStatuses['po-dashboard'] : false, isLoading),
        },
    ];

    return {
        steps,
        isLoading,
        woDetailId: resolvedWoDetailId,
    };
}
