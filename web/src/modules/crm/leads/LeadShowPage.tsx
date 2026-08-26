import { useParams, useNavigate } from "react-router-dom";
import { useState, useCallback, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { LeadDetailsSection } from "./components/LeadView";
import { FollowupViewPage } from "../followups/FollowupViewPage";
import { ShowPageLayout, type StepConfig } from "@/components/layout/ShowPageLayout";
import { useLeadStepStatuses } from "@/hooks/api/useLeadStepStatuses";
import { LeadEnquiriesSection } from "../lead-enquiry/LeadEnquiryShowPage";
import { LeadSiteVisitsSection } from "../lead-enquiry/components/LeadSiteVisitView";
import { EnquiryResultSection } from "../enquiry-result/EnquiryResultViewPage";
import { paths } from "@/app/routes/paths";

export default function LeadShowPage() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const leadId = id ? Number(id) : null;

    const stepStatuses = useLeadStepStatuses(leadId);
    const [searchParams] = useSearchParams();
    const initialSection = searchParams.get("section");

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
        () => new Set(initialSection === "followups" ? ["followups"] : ["lead-details"])
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
                    return <FollowupViewPage source={{ sourceType: 'lead', sourceId: leadId! }} />;
                case "enquiries":
                    return <LeadEnquiriesSection leadId={leadId!} />;
                case "site-visits":
                    return <LeadSiteVisitsSection leadId={leadId!} />;
                case "enquiry-result":
                    return <EnquiryResultSection leadId={leadId} />;
                default:
                    return null;
            }
        },
        [leadId]
    );

    if (!leadId) {
        return <div className="p-8 text-center text-muted-foreground">Invalid lead ID.</div>;
    }

    return (
        <ShowPageLayout
            steps={steps}
            expandedSections={expandedSections}
            onToggleSection={toggleSection}
            onExpandAll={expandAll}
            onCollapseAll={collapseAll}
            onBack={() => navigate(paths.crm.leads)}
            backLabel="Back to Leads"
            renderSectionContent={renderSectionContent}
        />
    );
}
