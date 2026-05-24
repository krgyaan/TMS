import { ShowPageLayout } from "@/components/layout/ShowPageLayout";
import { useWoStepStatuses } from "@/hooks/api/useWoStepStatuses";
import { ContractAgreementSection } from "@/modules/operations/contract-agreement/components/ContractAgreementSection";
import { KickOffSection } from "@/modules/operations/kick-off/components/KickOffSection";
import { PoDashboardSection } from "@/modules/operations/project-dashboard/components/PoDashboardSection";
import { BasicDetailsSection } from "@/modules/operations/wo-basic-details/components/BasicDetailsSection";
import { WoDetailsSection } from "@/modules/operations/wo-details/components/WoDetailsSection";
import { useCallback, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";

export default function WoShowPage() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const location = useLocation();
    const woId = id ? parseInt(id, 10) : null;

    const isBasicDetailRoute = location.pathname.includes('/details/basic/');
    const woDetailIdFromParam = isBasicDetailRoute ? null : woId;
    const woBasicDetailIdFromParam = isBasicDetailRoute ? woId : null;

    const { steps, woDetailId: resolvedWoDetailId } = useWoStepStatuses(
        woDetailIdFromParam,
        woBasicDetailIdFromParam
    );

    const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(["basic-details"]));

    const toggleSection = useCallback((stepId: string) => {
        setExpandedSections((prev) => {
            const next = new Set(prev);
            if (next.has(stepId)) next.delete(stepId); else next.add(stepId);
            return next;
        });
    }, []);

    const expandAll = useCallback(() => setExpandedSections(new Set(steps.map((s) => s.id))), [steps]);
    const collapseAll = useCallback(() => setExpandedSections(new Set()), []);

    const renderSectionContent = useCallback((stepId: string) => {
        if (!resolvedWoDetailId) return null;
        switch (stepId) {
            case "basic-details":
                return <BasicDetailsSection woDetailId={resolvedWoDetailId} />;
            case "wo-details":
                return <WoDetailsSection woDetailId={resolvedWoDetailId} />;
            case "kick-off":
                return <KickOffSection woDetailId={resolvedWoDetailId} />;
            case "contract-agreement":
                return <ContractAgreementSection woDetailId={resolvedWoDetailId} />;
            case "po-dashboard":
                return <PoDashboardSection woDetailId={resolvedWoDetailId} />;
            default:
                return null;
        }
    }, [resolvedWoDetailId]);

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
            onBack={() => navigate(-1)}
            backLabel="Back to List"
            renderSectionContent={renderSectionContent}
        />
    );
}
