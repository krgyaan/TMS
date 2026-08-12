import { useCustomer } from "@/hooks/api/useCustomer";
import { useConferenceByComplaint } from "@/hooks/api/useConference";
import { useServiceVisitByComplaint } from "@/hooks/api/useServiceVisit";
import { useServiceFeedbackByComplaint } from "@/hooks/api/useServiceFeedback";
import type { StepStatus } from "@/components/layout/ShowPageLayout";

function deriveStatus(hasData: boolean, isLoading: boolean): StepStatus {
    if (isLoading) return "loading";
    if (hasData) return "completed";
    return "pending";
}

export interface ComplaintStepStatus {
    id: string;
    label: string;
    shortLabel: string;
    stepNumber: number;
    hasData: boolean;
    isLoading: boolean;
    status: StepStatus;
}

export function useComplaintStepStatuses(complaintId: number | null) {
    const { data: complaint, isLoading: l1 } = useCustomer(complaintId ?? 0);
    const { data: conference, isLoading: l2 } = useConferenceByComplaint(complaintId ?? 0);
    const { data: visitReport, isLoading: l3 } = useServiceVisitByComplaint(complaintId ?? 0);
    const { data: feedback, isLoading: l4 } = useServiceFeedbackByComplaint(complaintId ?? 0);

    const steps: ComplaintStepStatus[] = [
        {
            id: "complaint-details",
            label: "Complaint Details",
            shortLabel: "Details",
            stepNumber: 1,
            hasData: !!complaint,
            isLoading: l1,
            status: deriveStatus(!!complaint, l1),
        },
        {
            id: "conference-report",
            label: "Conference Call Report",
            shortLabel: "Conference",
            stepNumber: 2,
            hasData: !!conference,
            isLoading: l2,
            status: deriveStatus(!!conference, l2),
        },
        {
            id: "service-visit-report",
            label: "Service Visit Report",
            shortLabel: "Visit",
            stepNumber: 3,
            hasData: !!visitReport,
            isLoading: l3,
            status: deriveStatus(!!visitReport, l3),
        },
        {
            id: "customer-feedback",
            label: "Customer Feedback",
            shortLabel: "Feedback",
            stepNumber: 4,
            hasData: !!feedback,
            isLoading: l4,
            status: deriveStatus(!!feedback, l4),
        },
    ];

    return { steps, complaint, conference, visitReport, feedback, isLoading: l1 || l2 || l3 || l4 };
}
