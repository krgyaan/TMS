import { useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ShowPageLayout } from "@/components/layout/ShowPageLayout";
import { useAmcStepStatuses } from "@/hooks/api/useAmcStepStatuses";
import { paths } from "@/app/routes/paths";
import { AmcDetailsSection } from "./components/AmcView";
import { AmcServiceSection } from "@/modules/services/amc-services/components/AmcServiceView";
import { AmcBillingSection } from "@/modules/services/amc-billing/components/AmcBillingView";

interface AmcViewPageProps {
    amcId: number;
    defaultSection: string;
    onBack?: () => void;
    backLabel?: string;
}

export function AmcViewPage({ amcId, defaultSection, onBack, backLabel }: AmcViewPageProps) {
    const { steps } = useAmcStepStatuses(amcId);

    const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set([defaultSection]));

    const toggleSection = useCallback((id: string) => {
        setExpandedSections(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    }, []);

    const expandAll = useCallback(() => setExpandedSections(new Set(steps.map(s => s.id))), [steps]);
    const collapseAll = useCallback(() => setExpandedSections(new Set()), []);

    const renderSectionContent = useCallback(
        (stepId: string) => {
            switch (stepId) {
                case "amc-details":
                    return <AmcDetailsSection amcId={amcId} />;
                case "service-details":
                    return <AmcServiceSection amcId={amcId} />;
                case "billing-details":
                    return <AmcBillingSection amcId={amcId} />;
                default:
                    return null;
            }
        },
        [amcId]
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

function AmcViewRoute() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const amcId = Number(id);

    return (
        <AmcViewPage
            amcId={amcId}
            defaultSection="amc-details"
            onBack={() => navigate(paths.services.amc)}
            backLabel="Back to List"
        />
    );
}

export default AmcViewRoute;
