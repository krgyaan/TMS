import { useLead } from "@/hooks/api/useLeads";
import { useLeadFollowups } from "@/hooks/api/useLeadFollowups";
import { useLeadEnquiries } from "@/hooks/api/useLeadEnquiry";
import { useQuery } from "@tanstack/react-query";
import { leadEnquiryService } from "@/services/api/lead-enquiry.service";
import type { StepStatus } from "@/components/layout/ShowPageLayout";

function deriveStatus(hasData: boolean, isLoading: boolean): StepStatus {
    if (isLoading) return "loading";
    if (hasData) return "completed";
    return "pending";
}

export interface LeadStepStatus {
    id: string;
    label: string;
    shortLabel: string;
    stepNumber: number;
    hasData: boolean;
    isLoading: boolean;
    status: StepStatus;
}

export function useLeadStepStatuses(leadId: number | null) {
    const { data: lead, isLoading: l1 } = useLead(leadId);
    const { data: followups, isLoading: l2 } = useLeadFollowups({ sourceType: 'lead', sourceId: leadId ?? 0 });

    const { data: enquiriesResponse, isLoading: l3 } = useLeadEnquiries(
        { page: 1, limit: 1, leadId: leadId ?? undefined },
    );

    const { data: siteVisits, isLoading: l4 } = useQuery({
        queryKey: ['site-visits', 'by-lead', leadId],
        queryFn: () => leadEnquiryService.getSiteVisitsByLead(leadId!),
        enabled: !!leadId,
    });

    const steps: LeadStepStatus[] = [
        {
            id: "lead-details",
            label: "Lead Details",
            shortLabel: "Details",
            stepNumber: 1,
            hasData: !!lead,
            isLoading: l1,
            status: deriveStatus(!!lead, l1),
        },
        {
            id: "followups",
            label: "Follow-ups",
            shortLabel: "FU",
            stepNumber: 2,
            hasData: Array.isArray(followups) && followups.length > 0,
            isLoading: l2,
            status: deriveStatus(Array.isArray(followups) && followups.length > 0, l2),
        },
        {
            id: "enquiries",
            label: "Enquiries",
            shortLabel: "Enq",
            stepNumber: 3,
            hasData: (enquiriesResponse?.meta?.total ?? 0) > 0,
            isLoading: l3,
            status: deriveStatus((enquiriesResponse?.meta?.total ?? 0) > 0, l3),
        },
        {
            id: "site-visits",
            label: "Site Visits",
            shortLabel: "SV",
            stepNumber: 4,
            hasData: Array.isArray(siteVisits) && siteVisits.length > 0,
            isLoading: l4,
            status: deriveStatus(Array.isArray(siteVisits) && siteVisits.length > 0, l4),
        },
    ];

    return steps;
}
