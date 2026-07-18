import { useParams, useNavigate } from "react-router-dom";
import { useState, useCallback } from "react";
import { useProjectOverview } from "@/hooks/api/useProjectDashboard";
import { useWoStepStatuses } from "@/hooks/api/useWoStepStatuses";
import { useWoDetailWithRelations } from "@/hooks/api/useWoDetails";
import { ShowPageLayout } from "@/components/layout/ShowPageLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { TenderViewPage } from "@/modules/tendering/tenders/TenderViewPage";
import { BasicDetailsSection } from "@/modules/operations/wo-basic-details/components/BasicDetailsSection";
import { WoDetailsSection } from "@/modules/operations/wo-details/components/WoDetailsSection";
import { KickOffSection } from "@/modules/operations/kick-off/components/KickOffSection";
import { ContractAgreementSection } from "@/modules/operations/contract-agreement/components/ContractAgreementSection";
import { PoDashboardSection } from "@/modules/operations/purchase-orders/components/PoDashboardSection";
import { paths } from "@/app/routes/paths";

export default function ProjectShowPage() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const projectId = parseInt(id || "0");

    const { data: overview } = useProjectOverview(projectId);

    const tenderId = overview?.tender?.id ?? null;
    const woBasicDetailId = overview?.woBasicDetail?.id ?? null;

    const { steps, woDetailId } = useWoStepStatuses(null, woBasicDetailId);

    const { data: woDetailRelations } = useWoDetailWithRelations(woDetailId ?? 0);

    const [activeTab, setActiveTab] = useState<"operation" | "tendering">("operation");

    const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(["basic-details"]));

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
    }, [woBasicDetailId, woDetailId]);

    if (!projectId) {
        return (
            <div className="p-8 text-center text-muted-foreground">
                <p>Invalid project ID.</p>
            </div>
        );
    }

    return (
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "operation" | "tendering")}>
            <TabsList className="mb-4">
                <TabsTrigger value="operation">Operation Details</TabsTrigger>
                <TabsTrigger value="tendering">Tendering Details</TabsTrigger>
            </TabsList>

            <TabsContent value="operation">
                {woBasicDetailId ? (
                    <ShowPageLayout
                        steps={steps}
                        expandedSections={expandedSections}
                        onToggleSection={toggleSection}
                        onExpandAll={expandAll}
                        onCollapseAll={collapseAll}
                        onBack={() => navigate(paths.operations.projectDashboard(projectId))}
                        backLabel="Back to Dashboard"
                        renderSectionContent={renderSectionContent}
                    />
                ) : (
                    <Card>
                        <CardContent className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground">
                            <p>No work order data linked to this project.</p>
                        </CardContent>
                    </Card>
                )}
            </TabsContent>

            <TabsContent value="tendering">
                {activeTab === "tendering" && tenderId ? (
                    <TenderViewPage
                        tenderId={tenderId}
                        onBack={() => navigate(paths.operations.projectDashboard(projectId))}
                        backLabel="Back to Dashboard"
                    />
                ) : (
                    <Card>
                        <CardContent className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground">
                            <p>No tendering data linked to this project.</p>
                        </CardContent>
                    </Card>
                )}
            </TabsContent>
        </Tabs>
    );
}
