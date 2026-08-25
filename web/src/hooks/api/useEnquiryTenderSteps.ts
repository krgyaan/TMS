import { useLead } from "@/hooks/api/useLeads";
import { useFollowups } from "@/hooks/api/useFollowups";
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

export function useEnquiryTenderSteps({
    tenderId,
    enquiryId,
}: {
    tenderId: number | null;
    enquiryId: number | null;
}) {
    const { data: enquiry, isLoading: lEnquiry } = useLeadEnquiry(enquiryId);
    const leadId = enquiry?.leadId ?? null;
    const siteVisitRequired = enquiry?.siteVisitRequired === true;

    const { data: lead, isLoading: lLead } = useLead(leadId);
    const { data: leadFollowups, isLoading: lLeadFollowups } = useFollowups({
        sourceType: "lead",
        sourceId: leadId ?? 0,
    });
    const { data: enquiryFollowups, isLoading: lEnquiryFollowups } = useFollowups({
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

    combined.push({
        id: "lead-details",
        label: "Lead Details",
        shortLabel: "Details",
        stepNumber: ++stepNumber,
        hasData: !!lead,
        isLoading: lLead,
        status: deriveStatus(!!lead, lLead),
    });
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

    return { steps: combined, tenderId, enquiryId, leadId };
}
