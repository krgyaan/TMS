import { useState, useCallback, useMemo } from "react";
import { LeadDetailsSection } from "./components/LeadView";
import { FollowupViewPage } from "../followups/FollowupViewPage";
import { ShowPageLayout, type StepConfig } from "@/components/layout/ShowPageLayout";
import { useLeadStepStatuses } from "@/hooks/api/useLeadStepStatuses";
import { LeadEnquiriesSection } from "../lead-enquiry/LeadEnquiryViewPage";
import { LeadSiteVisitsSection } from "../lead-enquiry/components/LeadSiteVisitView";
import { LeadCostingsSection } from "../enquirycosting/EnquiryCostingViewPage";
import { LeadQuotationsSection } from "../leads-quotation/LeadsQuotationViewPage";

interface LeadViewPageProps {
    leadId: number;
    onBack?: () => void;
    backLabel?: string;
}

export function LeadViewPage({ leadId, onBack, backLabel }: LeadViewPageProps) {
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

    const [expandedSections, setExpandedSections] = useState<Set<string>>(
        new Set(["lead-details"])
    );

    const toggleSection = useCallback((id: string) => {
        setExpandedSections((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    }, []);

    const expandAll = useCallback(
        () => setExpandedSections(new Set(steps.map((s) => s.id))),
        [steps]
    );

    const collapseAll = useCallback(() => setExpandedSections(new Set()), []);

    const renderSectionContent = useCallback(
        (stepId: string) => {
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
        },
        [leadId]
    );

    return (
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
    );
}
