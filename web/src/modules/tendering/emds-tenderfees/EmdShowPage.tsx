import { useParams, useNavigate } from "react-router-dom";
import { useState, useCallback, useMemo } from "react";
import { useTender } from "@/hooks/api/useTenders";
import { useTenderApproval } from "@/hooks/api/useTenderApprovals";
import { useInfoSheet } from "@/hooks/api/useInfoSheets";
import { usePhysicalDocByTenderId } from "@/hooks/api/usePhysicalDocs";
import { usePaymentRequestsByTender } from "@/hooks/api/useEmds";
import { paths } from "@/app/routes/paths";
import type { TenderWithRelations } from "@/modules/tendering/tenders/helpers/tenderInfo.types";
import { TenderView } from "@/modules/tendering/tenders/components/TenderView";
import { InfoSheetView } from "@/modules/tendering/info-sheet/components/InfoSheetView";
import { TenderApprovalView } from "@/modules/tendering/tender-approval/components/TenderApprovalView";
import { PhysicalDocsView } from "@/modules/tendering/physical-docs/components/PhysicalDocsView";
import { EmdTenderFeeShow } from "@/modules/tendering/emds-tenderfees/components/EmdTenderFeeShow";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import {
    ShowPageLayout,
    type StepConfig,
    type StepStatus,
} from "@/modules/tendering/components/ShowPageLayout";

export default function EmdShowPage() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const tenderId = id ? Number(id) : null;

    // ── Data fetching ──
    const { data: tender, isLoading: tenderLoading } = useTender(tenderId);
    const { data: approval, isLoading: approvalLoading } = useTenderApproval(tenderId);
    const { data: infoSheet, isLoading: infoSheetLoading } = useInfoSheet(tenderId);
    const { data: physicalDoc, isLoading: physicalDocLoading } = usePhysicalDocByTenderId(tenderId);
    const { data: paymentRequests, isLoading: requestsLoading } = usePaymentRequestsByTender(tenderId);

    const tenderWithRelations: TenderWithRelations | null = tender
        ? { ...tender, approval: approval || null }
        : null;


    // ── Derive step statuses ──
    const steps: StepConfig[] = useMemo(() => {
        function getStatus(hasData: boolean, loading: boolean): StepStatus {
            if (loading) return "loading";
            if (hasData) return "completed";
            return "pending";
        }

        return [
            {
                id: "tender-details",
                label: "Tender Details",
                shortLabel: "Tender Details",
                stepNumber: 1,
                hasData: !!tender,
                isLoading: tenderLoading || approvalLoading || infoSheetLoading,
                status: getStatus(!!tender, tenderLoading),
            },
            {
                id: "physical-docs",
                label: "Physical Documents",
                shortLabel: "Physical Docs",
                stepNumber: 2,
                hasData: !!physicalDoc,
                isLoading: physicalDocLoading,
                status: getStatus(!!physicalDoc, physicalDocLoading),
            },
            {
                id: "emd-fees",
                label: "EMD & Tender Fees",
                shortLabel: "EMD / Fees",
                stepNumber: 3,
                hasData: !!paymentRequests && paymentRequests.length > 0,
                isLoading: requestsLoading,
                status: getStatus(!!paymentRequests && paymentRequests.length > 0, requestsLoading),
            },
        ];
    }, [
        tender,
        tenderLoading,
        approvalLoading,
        infoSheetLoading,
        physicalDoc,
        physicalDocLoading,
        paymentRequests,
        requestsLoading,
    ]);

    // ── View state ──
    const [expandedSections, setExpandedSections] = useState<Set<string>>(
        new Set(["emd-fees"])
    );
    const [activeSection, setActiveSection] = useState("emd-fees");

    // ── Handlers ──
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

    const jumpToSection = useCallback((id: string) => {
        setActiveSection(id);
        const el = document.getElementById(`section-${id}`);
        if (el) {
            el.scrollIntoView({ behavior: "smooth", block: "start" });
        }
    }, []);

    // ── Section content renderers ──
    const renderSectionContent = (stepId: string) => {
        switch (stepId) {
            case "tender-details":
                return (
                    <div className="space-y-6">
                        {tenderWithRelations ? (
                            <TenderView
                                tender={tenderWithRelations}
                                isLoading={tenderLoading || approvalLoading}
                            />
                        ) : (
                            <Alert>
                                <AlertCircle className="h-4 w-4" />
                                <AlertDescription>Tender information not available.</AlertDescription>
                            </Alert>
                        )}
                        <InfoSheetView
                            infoSheet={infoSheet || null}
                            isLoading={infoSheetLoading}
                        />
                        {tenderWithRelations && (
                            <TenderApprovalView
                                tender={tenderWithRelations}
                                isLoading={tenderLoading || approvalLoading}
                            />
                        )}
                    </div>
                );

            case "physical-docs":
                return (
                    <PhysicalDocsView
                        physicalDoc={physicalDoc || null}
                        isLoading={physicalDocLoading}
                    />
                );

            case "emd-fees":
                return (
                    <EmdTenderFeeShow
                        paymentRequests={paymentRequests || null}
                        tender={tender || null}
                        isLoading={requestsLoading}
                    />
                );

            default:
                return null;
        }
    };

    if (!id) {
        return (
            <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>Invalid Tender ID.</AlertDescription>
            </Alert>
        );
    }

    return (
        <ShowPageLayout
            steps={steps}
            activeSection={activeSection}
            onJump={jumpToSection}
            onSectionVisible={setActiveSection}
            expandedSections={expandedSections}
            onToggleSection={toggleSection}
            onExpandAll={expandAll}
            onCollapseAll={collapseAll}
            onBack={() => navigate(paths.tendering.emdsTenderFees)}
            backLabel="Back to EMD / Tender Fees"
            renderSectionContent={renderSectionContent}
        />
    );
}
