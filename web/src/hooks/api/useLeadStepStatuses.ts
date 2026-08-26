import { useLead } from "@/hooks/api/useLeads";
import { useFollowups } from "@/hooks/api/useFollowups";
import { useHappyCalling } from "@/hooks/api/useHappyCalling";
import { useLeadEnquiries } from "@/hooks/api/useLeadEnquiry";
import { useQuery } from "@tanstack/react-query";
import { leadEnquiryService } from "@/services/api/lead-enquiry.service";
import { useEnquiryResultsByLead, useEnquiryResultsByHappyCalling } from "@/hooks/api/useEnquiryResult";
import type { StepStatus } from "@/components/layout/ShowPageLayout";
import type { FollowupSource } from "@/modules/crm/followups/helpers/followup.types";

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
    const { data: followups, isLoading: l2 } = useFollowups({ sourceType: 'lead', sourceId: leadId ?? 0 });

    const { data: enquiriesResponse, isLoading: l3 } = useLeadEnquiries(
        { page: 1, limit: 1, leadId: leadId ?? undefined },
    );

    const { data: siteVisits, isLoading: l4 } = useQuery({
        queryKey: ['site-visits', 'by-lead', leadId],
        queryFn: () => leadEnquiryService.getSiteVisitsByLead(leadId!),
        enabled: !!leadId,
    });

    const { data: enquiryResults, isLoading: l5 } = useEnquiryResultsByLead(leadId);

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
        {
            id: "enquiry-result",
            label: "Enquiry Result",
            shortLabel: "Result",
            stepNumber: 5,
            hasData: Array.isArray(enquiryResults) && enquiryResults.length > 0,
            isLoading: l5,
            status: deriveStatus(Array.isArray(enquiryResults) && enquiryResults.length > 0, l5),
        },
    ];

    return steps;
}

export function useSourceStepStatuses(source: FollowupSource) {
    const isLead = source.sourceType === 'lead';
    const isHappyCalling = source.sourceType === 'happy_calling';
    const leadId = isLead ? source.sourceId : null;
    const happyCallingId = isHappyCalling ? source.sourceId : null;
    const { data: lead, isLoading: l1Lead } = useLead(leadId);
    const { data: happyCalling, isLoading: l1Happy } = useHappyCalling(isLead ? null : source.sourceId);
    const { data: followups, isLoading: l2 } = useFollowups(source);

    const { data: enquiriesResponse, isLoading: l3 } = useQuery({
        queryKey: isLead
            ? ['lead-enquiries', 'status', 'by-lead', leadId]
            : ['lead-enquiries', 'status', 'by-happy-calling', happyCallingId],
        queryFn: () => isLead
            ? leadEnquiryService.getAll({ page: 1, limit: 1, leadId: leadId ?? undefined })
            : leadEnquiryService.getAll({ page: 1, limit: 1, happyCallingId: happyCallingId ?? undefined }),
        enabled: isLead ? !!leadId : !!happyCallingId,
    });

    const { data: siteVisits, isLoading: l4 } = useQuery({
        queryKey: isLead
            ? ['site-visits', 'by-lead', leadId]
            : ['site-visits', 'by-happy-calling', happyCallingId],
        queryFn: () => isLead
            ? leadEnquiryService.getSiteVisitsByLead(leadId!)
            : leadEnquiryService.getSiteVisitsByHappyCalling(happyCallingId!),
        enabled: isLead ? !!leadId : !!happyCallingId,
    });

    const { data: enquiryResultsByLead, isLoading: l5a } = useEnquiryResultsByLead(leadId);
    const { data: enquiryResultsByHappyCalling, isLoading: l5b } = useEnquiryResultsByHappyCalling(happyCallingId);
    const enquiryResults = isLead ? enquiryResultsByLead : enquiryResultsByHappyCalling;
    const l5 = isLead ? l5a : l5b;

    const record = isLead ? lead : happyCalling;
    const l1 = isLead ? l1Lead : l1Happy;

    const steps: LeadStepStatus[] = [
        {
            id: isLead ? "lead-details" : "happy-calling-details",
            label: isLead ? "Lead Details" : "Happy Calling",
            shortLabel: isLead ? "Details" : "HC",
            stepNumber: 1,
            hasData: !!record,
            isLoading: l1,
            status: deriveStatus(!!record, l1),
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
        {
            id: "enquiry-result",
            label: "Enquiry Result",
            shortLabel: "Result",
            stepNumber: 5,
            hasData: Array.isArray(enquiryResults) && enquiryResults.length > 0,
            isLoading: l5,
            status: deriveStatus(Array.isArray(enquiryResults) && enquiryResults.length > 0, l5),
        },
    ];

    return steps;
}
