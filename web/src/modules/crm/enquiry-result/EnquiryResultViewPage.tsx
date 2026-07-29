import { useState, useCallback, useMemo } from "react";
import { ShowPageLayout, type StepConfig } from "@/components/layout/ShowPageLayout";
import { useLeadStepStatuses } from "@/hooks/api/useLeadStepStatuses";
import { useEnquiryResult } from "@/hooks/api/useEnquiryResult";
import { useLeadEnquiry } from "@/hooks/api/useLeadEnquiry";
import { EnquiryResultView } from "./components/EnquiryResultView";
import { LeadDetailsSection } from "../leads/components/LeadView";
import { FollowupViewPage } from "../followups/FollowupViewPage";
import { LeadEnquiriesSection } from "../lead-enquiry/LeadEnquiryViewPage";
import { LeadSiteVisitsSection } from "../lead-enquiry/components/LeadSiteVisitView";
import { LeadCostingsSection } from "../enquirycosting/EnquiryCostingViewPage";
import { LeadQuotationsSection } from "../leads-quotation/LeadsQuotationViewPage";

interface EnquiryResultViewPageProps {
    resultId: number;
    onBack?: () => void;
    backLabel?: string;
}

export function EnquiryResultDetailsSection({ resultId }: { resultId: number | null }) {
    const { data: result, isLoading } = useEnquiryResult(resultId);

    if (isLoading && !result) {
        return <div className="flex items-center justify-center py-8 text-muted-foreground">Loading enquiry result...</div>;
    }

    return (
        <div className="space-y-6">
            {result ? (
                <EnquiryResultView result={result} />
            ) : (
                <p className="text-sm text-muted-foreground py-4 text-center">Enquiry result not available.</p>
            )}
        </div>
    );
}

export function EnquiryResultViewPage({ resultId, onBack, backLabel }: EnquiryResultViewPageProps) {
    const { data: result } = useEnquiryResult(resultId);
    const enquiryId = result?.enquiryId ?? null;
    const { data: enquiry } = useLeadEnquiry(enquiryId);
    const leadId = enquiry?.leadId ?? null;
    const stepStatuses = useLeadStepStatuses(leadId);

    const steps = useMemo<StepConfig[]>(() => stepStatuses.map(s => ({
        id: s.id,
        label: s.label,
        shortLabel: s.shortLabel,
        stepNumber: s.stepNumber,
        status: s.status,
        hasData: s.hasData,
        isLoading: s.isLoading,
    })), [stepStatuses]);

    const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(["enquiry-result"]));

    const toggleSection = useCallback((id: string) => {
        setExpandedSections((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    }, []);

    const expandAll = useCallback(() => setExpandedSections(new Set(steps.map((s) => s.id))), [steps]);
    const collapseAll = useCallback(() => setExpandedSections(new Set()), []);

    const renderSectionContent = useCallback((stepId: string) => {
        if (!leadId) {
            return <div className="flex items-center justify-center py-8 text-muted-foreground">Loading...</div>;
        }
        switch (stepId) {
            case "lead-details":
                return <LeadDetailsSection leadId={leadId} />;
            case "followups":
                return <FollowupViewPage leadId={leadId} />;
            case "enquiries":
                return <LeadEnquiriesSection leadId={leadId} />;
            case "site-visits":
                return <LeadSiteVisitsSection leadId={leadId} />;
            case "costings":
                return <LeadCostingsSection leadId={leadId} />;
            case "quotations":
                return <LeadQuotationsSection leadId={leadId} />;
            default:
                return null;
        }
    }, [leadId]);

    return (
        <>
            <EnquiryResultDetailsSection resultId={resultId} />

            <ShowPageLayout
                steps={steps}
                expandedSections={expandedSections}
                onToggleSection={toggleSection}
                onExpandAll={expandAll}
                onCollapseAll={collapseAll}
                onBack={onBack}
                backLabel={backLabel}
                renderSectionContent={renderSectionContent}
            />
        </>
    );
}
