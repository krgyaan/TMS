import { useParams, useNavigate } from "react-router-dom";
import { useState, useCallback } from "react";
import { LeadDetailsSection } from "./components/LeadView";
import { paths } from "@/app/routes/paths";
import { ShowPageLayout, type StepConfig } from "@/components/layout/ShowPageLayout";

const LEAD_STEPS: StepConfig[] = [
    {
        id: "lead-details",
        label: "Lead Details",
        shortLabel: "Details",
        stepNumber: 1,
        status: "completed",
        hasData: true,
        isLoading: false,
    },
];

export default function LeadShowPage() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const leadId = id ? Number(id) : null;

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
        () => setExpandedSections(new Set(LEAD_STEPS.map((s) => s.id))),
        []
    );

    const collapseAll = useCallback(() => setExpandedSections(new Set()), []);

    const renderSectionContent = useCallback(
        (stepId: string) => {
            switch (stepId) {
                case "lead-details":
                    return <LeadDetailsSection leadId={leadId} />;
                default:
                    return null;
            }
        },
        [leadId]
    );

    return (
        <ShowPageLayout
            steps={LEAD_STEPS}
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