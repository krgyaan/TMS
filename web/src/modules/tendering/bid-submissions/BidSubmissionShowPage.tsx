import { useParams, useNavigate } from "react-router-dom";
import { useState, useCallback, useMemo } from "react";
import { useBidSubmissionByTender } from "@/hooks/api/useBidSubmissions";
import { useTender } from "@/hooks/api/useTenders";
import { useTenderApproval } from "@/hooks/api/useTenderApprovals";
import { useInfoSheet } from "@/hooks/api/useInfoSheets";
import { usePhysicalDocByTenderId } from "@/hooks/api/usePhysicalDocs";
import { usePaymentRequestsByTender } from "@/hooks/api/useEmds";
import { useDocumentChecklistByTender } from "@/hooks/api/useDocumentChecklists";
import { useCostingSheetByTender } from "@/hooks/api/useCostingSheets";
import { paths } from "@/app/routes/paths";
import type { TenderWithRelations } from "@/modules/tendering/tenders/helpers/tenderInfo.types";
import { TenderView } from "@/modules/tendering/tenders/components/TenderView";
import { InfoSheetView } from "@/modules/tendering/info-sheet/components/InfoSheetView";
import { TenderApprovalView } from "@/modules/tendering/tender-approval/components/TenderApprovalView";
import { PhysicalDocsView } from "@/modules/tendering/physical-docs/components/PhysicalDocsView";
import { EmdTenderFeeShow } from "@/modules/tendering/emds-tenderfees/components/EmdTenderFeeShow";
import { DocumentChecklistView } from "@/modules/tendering/checklists/components/DocumentChecklistView";
import { CostingSheetView } from "@/modules/tendering/costing-sheets/components/CostingSheetView";
import { BidSubmissionView } from "./components/BidSubmissionView";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import {
    ShowPageLayout,
    type StepConfig,
    type StepStatus,
} from "@/modules/tendering/components/ShowPageLayout";

export default function BidSubmissionShowPage() {
    const { tenderId } = useParams<{ tenderId: string }>();
    const navigate = useNavigate();
    const tenderIdNum = tenderId ? Number(tenderId) : null;

    // ── Data fetching ──
    const { data: tender, isLoading: tenderLoading } = useTender(tenderIdNum);
    const { data: approval, isLoading: approvalLoading } = useTenderApproval(tenderIdNum);
    const { data: infoSheet, isLoading: infoSheetLoading } = useInfoSheet(tenderIdNum);
    const { data: physicalDoc, isLoading: physicalDocLoading } = usePhysicalDocByTenderId(tenderIdNum);
    const { data: paymentRequests, isLoading: requestsLoading } = usePaymentRequestsByTender(tenderIdNum);
    const { data: documentChecklist, isLoading: documentChecklistLoading } = useDocumentChecklistByTender(tenderIdNum ?? 0);
    const { data: costingSheet, isLoading: costingSheetLoading } = useCostingSheetByTender(tenderIdNum ?? 0);
    const { data: bidSubmission, isLoading: bidLoading } = useBidSubmissionByTender(tenderIdNum ?? 0);

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
            {
                id: "checklist",
                label: "Document Checklist",
                shortLabel: "Checklist",
                stepNumber: 4,
                hasData: !!documentChecklist,
                isLoading: documentChecklistLoading,
                status: getStatus(!!documentChecklist, documentChecklistLoading),
            },
            {
                id: "costing",
                label: "Costing Sheet",
                shortLabel: "Costing",
                stepNumber: 5,
                hasData: !!costingSheet,
                isLoading: costingSheetLoading,
                status: getStatus(!!costingSheet, costingSheetLoading),
            },
            {
                id: "bid-submission",
                label: "Bid Submission",
                shortLabel: "Bid",
                stepNumber: 6,
                hasData: !!bidSubmission,
                isLoading: bidLoading,
                status: getStatus(!!bidSubmission, bidLoading),
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
        documentChecklist,
        documentChecklistLoading,
        costingSheet,
        costingSheetLoading,
        bidSubmission,
        bidLoading,
    ]);

    // ── View state ──
    const [expandedSections, setExpandedSections] = useState<Set<string>>(
        new Set(["bid-submission"])
    );
    const [activeSection, setActiveSection] = useState("bid-submission");

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
                        {infoSheetLoading ? (
                            <InfoSheetView isLoading />
                        ) : infoSheet ? (
                            <InfoSheetView infoSheet={infoSheet} />
                        ) : (
                            <Alert>
                                <AlertCircle className="h-4 w-4" />
                                <AlertDescription>No info sheet exists for this tender yet.</AlertDescription>
                            </Alert>
                        )}
                        {tenderWithRelations && (
                            <TenderApprovalView
                                tender={tenderWithRelations}
                                isLoading={tenderLoading || approvalLoading}
                            />
                        )}
                    </div>
                );

            case "physical-docs":
                return physicalDocLoading ? (
                    <PhysicalDocsView physicalDoc={null} isLoading />
                ) : (
                    <PhysicalDocsView physicalDoc={physicalDoc || null} />
                );

            case "emd-fees":
                return (
                    <EmdTenderFeeShow
                        paymentRequests={paymentRequests || null}
                        tender={tender || null}
                        isLoading={requestsLoading}
                    />
                );

            case "checklist":
                return (
                    <DocumentChecklistView
                        checklist={documentChecklist}
                        isLoading={documentChecklistLoading}
                    />
                );

            case "costing":
                return (
                    <CostingSheetView
                        costingSheet={costingSheet}
                        isLoading={costingSheetLoading}
                    />
                );

            case "bid-submission":
                return (
                    <BidSubmissionView
                        bidSubmission={bidSubmission}
                        isLoading={bidLoading}
                    />
                );

            default:
                return null;
        }
    };

    if (!tenderId) {
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
            onBack={() => navigate(paths.tendering.bidSubmissions)}
            backLabel="Back to Bid Submissions"
            renderSectionContent={renderSectionContent}
        />
    );
}
