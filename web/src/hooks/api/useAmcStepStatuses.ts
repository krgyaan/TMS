import { useAmc } from "@/hooks/api/useAmc";
import type { StepStatus } from "@/components/layout/ShowPageLayout";

export interface AmcStepStatus {
    id: string;
    label: string;
    shortLabel: string;
    stepNumber: number;
    hasData: boolean;
    isLoading: boolean;
    status: StepStatus;
}

function deriveStatus(hasData: boolean, allDone: boolean, isLoading: boolean): StepStatus {
    if (isLoading) return "loading";
    if (!hasData) return "pending";
    return allDone ? "completed" : "in-progress";
}

export function useAmcStepStatuses(amcId: number | null) {
    const { data: amc, isLoading } = useAmc(amcId ?? 0);

    const services = amc?.services ?? [];
    const bills = amc?.bills ?? [];
    const allServicesDone = services.length > 0 && services.every(s => s.status === "Done");
    const allBillsPaid = bills.length > 0 && bills.every(b => b.status === "Payment Received");

    const steps: AmcStepStatus[] = [
        {
            id: "amc-details",
            label: "AMC Details",
            shortLabel: "Details",
            stepNumber: 1,
            hasData: !!amc,
            isLoading,
            status: deriveStatus(!!amc, true, isLoading),
        },
        {
            id: "service-details",
            label: "Service Details",
            shortLabel: "Service",
            stepNumber: 2,
            hasData: services.length > 0,
            isLoading,
            status: deriveStatus(services.length > 0, allServicesDone, isLoading),
        },
        {
            id: "billing-details",
            label: "Billing Details",
            shortLabel: "Billing",
            stepNumber: 3,
            hasData: bills.length > 0,
            isLoading,
            status: deriveStatus(bills.length > 0, allBillsPaid, isLoading),
        },
    ];

    return { steps, amc, isLoading };
}
