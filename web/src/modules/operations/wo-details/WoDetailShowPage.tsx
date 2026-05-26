import { useParams, useNavigate } from "react-router-dom";
import { useState, useCallback } from "react";
import { useWoStepStatuses } from "@/hooks/api/useWoStepStatuses";
import { ShowPageLayout } from "@/components/layout/ShowPageLayout";
import { BasicDetailsSection } from "@/modules/operations/wo-basic-details/components/BasicDetailsSection";
import { WoDetailsSection } from "@/modules/operations/wo-details/components/WoDetailsSection";
import { KickOffSection } from "@/modules/operations/kick-off/components/KickOffSection";
import { ContractAgreementSection } from "@/modules/operations/contract-agreement/components/ContractAgreementSection";
import { PoDashboardSection } from "@/modules/operations/project-dashboard/components/PoDashboardSection";
import { paths } from "@/app/routes/paths";

export default function WoDetailShowPage() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const woId = parseInt(id || "0");

    const { steps, woDetailId } = useWoStepStatuses(woId);

    const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(["wo-details"]));

    const toggleSection = useCallback((id: string) => {
        setExpandedSections((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id); else next.add(id);
            return next;
        });
    }, []);

    const expandAll = useCallback(() => setExpandedSections(new Set(steps.map((s) => s.id))), [steps]);
    const collapseAll = useCallback(() => setExpandedSections(new Set()), []);

    const renderSectionContent = useCallback((stepId: string) => {
        if (!woDetailId) return null;
        switch (stepId) {
            case "basic-details":        return <BasicDetailsSection woDetailId={woDetailId} />;
            case "wo-details":           return <WoDetailsSection woDetailId={woDetailId} />;
            case "kick-off":             return <KickOffSection woDetailId={woDetailId} />;
            case "contract-agreement":   return <ContractAgreementSection woDetailId={woDetailId} />;
            case "po-dashboard":         return <PoDashboardSection woDetailId={woDetailId} />;
            default:                     return null;
        }
    }, [woDetailId]);

    if (!woId) {
        return (
            <div className="p-8 text-center text-muted-foreground">
                <p>Invalid work order ID.</p>
            </div>
        );
    }

    return (
        <ShowPageLayout
            steps={steps}
            expandedSections={expandedSections}
            onToggleSection={toggleSection}
            onExpandAll={expandAll}
            onCollapseAll={collapseAll}
            onBack={() => navigate(paths.operations.woDetailAcceptanceListPage)}
            backLabel="Back to Acceptance List"
            renderSectionContent={renderSectionContent}
        />
    );
}
