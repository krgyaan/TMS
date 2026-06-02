import { useParams, useNavigate } from "react-router-dom";
import { useState, useCallback } from "react";
import { useWoStepStatuses } from "@/hooks/api/useWoStepStatuses";
import { useWoDetailWithRelations } from "@/hooks/api/useWoDetails";
import { ShowPageLayout } from "@/components/layout/ShowPageLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TenderViewPage } from "@/modules/tendering/tenders/TenderViewPage";
import { BasicDetailsSection } from "@/modules/operations/wo-basic-details/components/BasicDetailsSection";
import { WoDetailsSection } from "@/modules/operations/wo-details/components/WoDetailsSection";
import { KickOffSection } from "@/modules/operations/kick-off/components/KickOffSection";
import { ContractAgreementSection } from "@/modules/operations/contract-agreement/components/ContractAgreementSection";
import { PoDashboardSection } from "@/modules/operations/project-dashboard/components/PoDashboardSection";
import { paths } from "@/app/routes/paths";

export default function KickOffShowPage() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const woId = parseInt(id || "0");

    const { steps, woDetailId } = useWoStepStatuses(woId);

    const { data: woDetailRelations } = useWoDetailWithRelations(woDetailId ?? 0);
    const woBasicDetail = woDetailRelations?.woBasicDetail;
    const tenderId = woBasicDetail?.tenderId ?? null;
    const woBasicDetailId = woBasicDetail?.id ?? null;

    const [activeTab, setActiveTab] = useState<"operation" | "tendering">("operation");

    const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(["kick-off"]));

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
        switch (stepId) {
            case "basic-details":
                return woBasicDetailId ? <BasicDetailsSection woBasicDetailId={woBasicDetailId} /> : null;
            case "wo-details":
                return woDetailId ? <WoDetailsSection woDetailId={woDetailId} /> : null;
            case "kick-off":
                return woDetailId ? <KickOffSection woDetailId={woDetailId} /> : null;
            case "contract-agreement":
                return woDetailId ? <ContractAgreementSection woDetailId={woDetailId} /> : null;
            case "po-dashboard":
                return woDetailId ? <PoDashboardSection woDetailId={woDetailId} /> : null;
            default:
                return null;
        }
    }, [woDetailId, woBasicDetailId]);

    if (!woId) {
        return (
            <div className="p-8 text-center text-muted-foreground">
                <p>Invalid work order ID.</p>
            </div>
        );
    }

    return (
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "operation" | "tendering")}>
            <TabsList className="mb-6">
                <TabsTrigger value="operation">Operation Details</TabsTrigger>
                <TabsTrigger value="tendering">Tendering Details</TabsTrigger>
            </TabsList>
            <TabsContent value="operation">
                <ShowPageLayout
                    steps={steps}
                    expandedSections={expandedSections}
                    onToggleSection={toggleSection}
                    onExpandAll={expandAll}
                    onCollapseAll={collapseAll}
                    onBack={() => navigate(paths.operations.woKickOffListPage)}
                    backLabel="Back to Kick-off Meetings"
                    renderSectionContent={renderSectionContent}
                />
            </TabsContent>
            <TabsContent value="tendering">
                {activeTab === "tendering" && tenderId ? (
                    <TenderViewPage
                        tenderId={tenderId}
                        onBack={() => navigate(paths.operations.woKickOffListPage)}
                        backLabel="Back to Kick-off Meetings"
                    />
                ) : (
                    <div className="p-8 text-center text-muted-foreground">
                        <p>No tendering data linked to this work order.</p>
                    </div>
                )}
            </TabsContent>
        </Tabs>
    );
}
