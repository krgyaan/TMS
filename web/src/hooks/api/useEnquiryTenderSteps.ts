import { useLead } from "@/hooks/api/useLeads";
import { useHappyCalling } from "@/hooks/api/useHappyCalling";
import { useLeadFollowups } from "@/hooks/api/useLeadFollowups";
import { useLeadEnquiry, useSiteVisits } from "@/hooks/api/useLeadEnquiry";
import { useTenderStepStatuses } from "@/hooks/api/useTenderStepStatuses";
import type { StepStatus } from "@/components/layout/ShowPageLayout";

function deriveStatus(hasData: boolean, isLoading: boolean): StepStatus {
    if (isLoading) return "loading";
    if (hasData) return "completed";
    return "pending";
}

export interface EnquiryTenderStep {
    id: string;
    label: string;
    shortLabel: string;
    stepNumber: number;
    hasData: boolean;
    isLoading: boolean;
    status: StepStatus;
}

export type EnquiryTenderSourceType = 'lead' | 'enquiry' | 'happy_calling';

export function useEnquiryTenderSteps({
    tenderId,
    enquiryId,
    sourceType = 'lead',
}: {
    tenderId: number | null;
    enquiryId: number | null;
    sourceType?: EnquiryTenderSourceType;
}) {
    const { data: enquiry, isLoading: lEnquiry } = useLeadEnquiry(enquiryId);
    const leadId = sourceType === 'happy_calling' ? null : (enquiry?.leadId ?? null);
    const happyCallingId = sourceType === 'happy_calling' ? (enquiry?.happyCallingId ?? null) : null;
    const siteVisitRequired = enquiry?.siteVisitRequired === true;

    const { data: lead, isLoading: lLead } = useLead(leadId);
    const { data: happyCalling, isLoading: lHappyCalling } = useHappyCalling(happyCallingId);
    const { data: leadFollowups, isLoading: lLeadFollowups } = useLeadFollowups({
        sourceType: sourceType === 'happy_calling' ? 'happy_calling' : 'lead',
        sourceId: sourceType === 'happy_calling' ? (happyCallingId ?? 0) : (leadId ?? 0),
    });
    const { data: enquiryFollowups, isLoading: lEnquiryFollowups } = useLeadFollowups({
        sourceType: "enquiry",
        sourceId: enquiryId ?? 0,
    });
    const { data: siteVisits, isLoading: lSiteVisits } = useSiteVisits(enquiryId);

    const { steps: tenderSteps } = useTenderStepStatuses(tenderId);

    const tenderStepMap = new Map(tenderSteps.map((s) => [s.id, s]));
    const hiddenTenderSteps = new Set(["emd-fees"]);

    const combined: EnquiryTenderStep[] = [];
    let stepNumber = 0;

    const pushTenderStep = (id: string) => {
        const ts = tenderStepMap.get(id);
        if (!ts || hiddenTenderSteps.has(id)) return;
        combined.push({
            id,
            label: ts.label,
            shortLabel: ts.shortLabel,
            stepNumber: ++stepNumber,
            hasData: ts.hasData,
            isLoading: ts.isLoading,
            status: ts.status,
        });
    };

    if (sourceType === 'happy_calling') {
        combined.push({
            id: "happy-calling-details",
            label: "Happy Calling",
            shortLabel: "HC",
            stepNumber: ++stepNumber,
            hasData: !!happyCalling,
            isLoading: lHappyCalling,
            status: deriveStatus(!!happyCalling, lHappyCalling),
        });
    } else {
        combined.push({
            id: "lead-details",
            label: "Lead Details",
            shortLabel: "Details",
            stepNumber: ++stepNumber,
            hasData: !!lead,
            isLoading: lLead,
            status: deriveStatus(!!lead, lLead),
        });
    }
    combined.push({
        id: "followups",
        label: "Follow-ups",
        shortLabel: "FU",
        stepNumber: ++stepNumber,
        hasData: Array.isArray(leadFollowups) && leadFollowups.length > 0,
        isLoading: lLeadFollowups,
        status: deriveStatus(Array.isArray(leadFollowups) && leadFollowups.length > 0, lLeadFollowups),
    });
    combined.push({
        id: "enquiry",
        label: "Enquiry",
        shortLabel: "Enq",
        stepNumber: ++stepNumber,
        hasData: !!enquiry,
        isLoading: lEnquiry,
        status: deriveStatus(!!enquiry, lEnquiry),
    });

    if (siteVisitRequired) {
        combined.push({
            id: "site-visit",
            label: "Site Visit",
            shortLabel: "SV",
            stepNumber: ++stepNumber,
            hasData: Array.isArray(siteVisits) && siteVisits.length > 0,
            isLoading: lSiteVisits,
            status: deriveStatus(Array.isArray(siteVisits) && siteVisits.length > 0, lSiteVisits),
        });
    }

    pushTenderStep("tender-details");
    pushTenderStep("physical-docs");
    pushTenderStep("rfq");
    pushTenderStep("checklist");
    pushTenderStep("costing");
    pushTenderStep("bid");

    combined.push({
        id: "quotation-followup",
        label: "Quotation Followup",
        shortLabel: "Q-FU",
        stepNumber: ++stepNumber,
        hasData: Array.isArray(enquiryFollowups) && enquiryFollowups.length > 0,
        isLoading: lEnquiryFollowups,
        status: deriveStatus(Array.isArray(enquiryFollowups) && enquiryFollowups.length > 0, lEnquiryFollowups),
    });

    pushTenderStep("result");
    pushTenderStep("basic-details");

    return { steps: combined, tenderId, enquiryId, leadId, happyCallingId };
}
