import { useParams, useNavigate } from "react-router-dom";
import { useState, useCallback, useMemo } from "react";
import { useTender } from "@/hooks/api/useTenders";
import { useTenderApproval } from "@/hooks/api/useTenderApprovals";
import { useInfoSheet } from "@/hooks/api/useInfoSheets";
import { useRfqByTenderId } from "@/hooks/api/useRfqs";
import { useRfqResponses } from "@/hooks/api/useRfqResponses";
import { usePhysicalDocByTenderId } from "@/hooks/api/usePhysicalDocs";
import { usePaymentRequestsByTender } from "@/hooks/api/useEmds";
import { useDocumentChecklistByTender } from "@/hooks/api/useDocumentChecklists";
import { useCostingSheetByTender } from "@/hooks/api/useCostingSheets";
import { useBidSubmissionByTender } from "@/hooks/api/useBidSubmissions";
import { useTenderResultByTenderId } from "@/hooks/api/useTenderResults";
import { TenderView } from "@/modules/tendering/tenders/components/TenderView";
import { InfoSheetView } from "@/modules/tendering/info-sheet/components/InfoSheetView";
import { TenderApprovalView } from "@/modules/tendering/tender-approval/components/TenderApprovalView";
import { RfqView } from "@/modules/tendering/rfqs/components/RfqView";
import { RfqResponsesTable } from "@/modules/tendering/rfq-response/components/RfqResponsesTable";
import { PhysicalDocsView } from "@/modules/tendering/physical-docs/components/PhysicalDocsView";
import { EmdTenderFeeShow } from "@/modules/tendering/emds-tenderfees/components/EmdTenderFeeShow";
import { DocumentChecklistView } from "@/modules/tendering/checklists/components/DocumentChecklistView";
import { CostingSheetView } from "@/modules/tendering/costing-sheets/components/CostingSheetView";
import { BidSubmissionView } from "@/modules/tendering/bid-submissions/components/BidSubmissionView";
import { TenderResultShow } from "@/modules/tendering/results/components/TenderResultShow";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { paths } from "@/app/routes/paths";
import type { TenderWithRelations } from "@/modules/tendering/tenders/helpers/tenderInfo.types";
import { AlertCircle, List } from "lucide-react";
import {
    ShowPageLayout,
    type StepConfig,
    type StepStatus,
} from "@/modules/tendering/components/ShowPageLayout";

export default function TenderShowPage() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const parsedId = id ? Number(id) : NaN;
    const tenderId = Number.isNaN(parsedId) ? null : parsedId;

    // ── Data fetching ──
    const { data: tender, isLoading } = useTender(tenderId);
    const { data: approval, isLoading: approvalLoading } =
        useTenderApproval(tenderId);
    const {
        data: infoSheet,
        isLoading: infoSheetLoading,
        error: infoSheetError,
    } = useInfoSheet(tenderId);
    const { data: rfq, isLoading: rfqLoading } = useRfqByTenderId(tenderId);
    const rfqId = Array.isArray(rfq) && rfq.length > 0 ? rfq[0].id : null;
    const { data: rfqResponses = [], isLoading: rfqResponsesLoading } =
        useRfqResponses(rfqId);
    const { data: physicalDoc, isLoading: physicalDocLoading } =
        usePhysicalDocByTenderId(tenderId);
    const { data: paymentRequests, isLoading: paymentRequestsLoading } =
        usePaymentRequestsByTender(tenderId);
    const { data: checklist, isLoading: checklistLoading } =
        useDocumentChecklistByTender(tenderId ?? 0);
    const { data: costingSheet, isLoading: costingSheetLoading } =
        useCostingSheetByTender(tenderId ?? 0);
    const { data: bidSubmission, isLoading: bidSubmissionLoading } =
        useBidSubmissionByTender(tenderId ?? 0);
    const { data: tenderResult, isLoading: resultLoading } =
        useTenderResultByTenderId(tenderId);

    const tenderWithRelations: TenderWithRelations | null = tender
        ? { ...tender, approval: approval || null }
        : null;

    // ── Derive step statuses ──
    const steps: StepConfig[] = useMemo(() => {
        const hasRfq = Array.isArray(rfq) && rfq.length > 0;
        const hasPhysicalDoc = !!physicalDoc;
        const hasPaymentRequests =
            !!paymentRequests && paymentRequests.length > 0;
        const hasChecklist = !!checklist;
        const hasCostingSheet = !!costingSheet;
        const hasBidSubmission = !!bidSubmission;
        const hasTenderResult = !!tenderResult;

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
                isLoading: isLoading || approvalLoading || infoSheetLoading,
                status: getStatus(!!tender, isLoading),
            },
            {
                id: "physical-docs",
                label: "Physical Documents",
                shortLabel: "Physical Docs",
                stepNumber: 2,
                hasData: hasPhysicalDoc,
                isLoading: physicalDocLoading,
                status: getStatus(hasPhysicalDoc, physicalDocLoading),
            },
            {
                id: "rfq",
                label: "RFQ & Responses",
                shortLabel: "RFQ",
                stepNumber: 3,
                hasData: hasRfq,
                isLoading: rfqLoading,
                status: getStatus(hasRfq, rfqLoading),
            },
            {
                id: "emd-fees",
                label: "EMD & Tender Fees",
                shortLabel: "EMD / Fees",
                stepNumber: 4,
                hasData: hasPaymentRequests,
                isLoading: paymentRequestsLoading,
                status: getStatus(hasPaymentRequests, paymentRequestsLoading),
            },
            {
                id: "checklist",
                label: "Document Checklist",
                shortLabel: "Checklist",
                stepNumber: 5,
                hasData: hasChecklist,
                isLoading: checklistLoading,
                status: getStatus(hasChecklist, checklistLoading),
            },
            {
                id: "costing",
                label: "Costing Sheet",
                shortLabel: "Costing",
                stepNumber: 6,
                hasData: hasCostingSheet,
                isLoading: costingSheetLoading,
                status: getStatus(hasCostingSheet, costingSheetLoading),
            },
            {
                id: "bid",
                label: "Bid Submission",
                shortLabel: "Bid",
                stepNumber: 7,
                hasData: hasBidSubmission,
                isLoading: bidSubmissionLoading,
                status: getStatus(hasBidSubmission, bidSubmissionLoading),
            },
            {
                id: "result",
                label: "Result",
                shortLabel: "Result",
                stepNumber: 8,
                hasData: hasTenderResult,
                isLoading: resultLoading,
                status: getStatus(hasTenderResult, resultLoading),
            },
        ];
    }, [
        tender,
        isLoading,
        approvalLoading,
        infoSheetLoading,
        rfq,
        rfqLoading,
        physicalDoc,
        physicalDocLoading,
        paymentRequests,
        paymentRequestsLoading,
        checklist,
        checklistLoading,
        costingSheet,
        costingSheetLoading,
        bidSubmission,
        bidSubmissionLoading,
        tenderResult,
        resultLoading,
    ]);

    // ── View state ──
    const [expandedSections, setExpandedSections] = useState<Set<string>>(
        new Set(["tender-details"])
    );
    const [activeSection, setActiveSection] = useState("tender-details");

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
                                isLoading={isLoading || approvalLoading}
                            />
                        ) : isLoading ? (
                            <TenderView tender={null as any} isLoading />
                        ) : (
                            <Alert>
                                <AlertCircle className="h-4 w-4" />
                                <AlertDescription>
                                    Tender information not available.
                                </AlertDescription>
                            </Alert>
                        )}

                        {infoSheetLoading ? (
                            <InfoSheetView isLoading />
                        ) : infoSheet ? (
                            <InfoSheetView infoSheet={infoSheet} />
                        ) : infoSheetError ? (
                            <Alert variant="destructive">
                                <AlertCircle className="h-4 w-4" />
                                <AlertDescription>
                                    Failed to load info sheet details. Please try again later.
                                </AlertDescription>
                            </Alert>
                        ) : (
                            <Alert>
                                <AlertCircle className="h-4 w-4" />
                                <AlertDescription>
                                    No info sheet exists for this tender yet.
                                </AlertDescription>
                            </Alert>
                        )}

                        {tenderWithRelations && (
                            <TenderApprovalView
                                tender={tenderWithRelations}
                                isLoading={isLoading || approvalLoading}
                            />
                        )}
                    </div>
                );

            case "physical-docs":
                return physicalDocLoading ? (
                    <PhysicalDocsView physicalDoc={null} isLoading />
                ) : physicalDoc ? (
                    <PhysicalDocsView physicalDoc={physicalDoc} />
                ) : (
                    <PhysicalDocsView physicalDoc={null} />
                );

            case "rfq":
                return rfqLoading ? (
                    <RfqView rfq={null} tender={tender ?? undefined} isLoading />
                ) : Array.isArray(rfq) && rfq.length > 0 ? (
                    <div className="space-y-6">
                        <RfqView rfq={rfq[0]} tender={tender ?? undefined} />
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <h3 className="text-lg font-semibold">RFQ Responses</h3>
                                {rfqId != null && (
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() =>
                                            navigate(paths.tendering.rfqsResponseList(rfqId))
                                        }
                                    >
                                        <List className="h-4 w-4 mr-2" />
                                        View all
                                    </Button>
                                )}
                            </div>
                            <RfqResponsesTable
                                responses={rfqResponses}
                                isLoading={rfqResponsesLoading}
                                rfqId={rfqId}
                            />
                        </div>
                    </div>
                ) : (
                    <Alert>
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                            No RFQ exists for this tender yet.
                            <Button
                                className="mt-4"
                                onClick={() =>
                                    navigate(paths.tendering.rfqsCreate(tenderId!))
                                }
                            >
                                Create RFQ
                            </Button>
                        </AlertDescription>
                    </Alert>
                );

            case "emd-fees":
                return paymentRequestsLoading ? (
                    <EmdTenderFeeShow paymentRequests={null} isLoading />
                ) : paymentRequests && paymentRequests.length > 0 ? (
                    <EmdTenderFeeShow
                        paymentRequests={paymentRequests}
                        tender={tender ?? null}
                    />
                ) : (
                    <Alert>
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                            No payment requests available for this tender yet.
                            <Button
                                className="mt-4"
                                onClick={() =>
                                    navigate(paths.tendering.emdsTenderFeesCreate(tenderId!))
                                }
                            >
                                Create Payment Request
                            </Button>
                        </AlertDescription>
                    </Alert>
                );

            case "checklist":
                return checklistLoading ? (
                    <DocumentChecklistView checklist={null} isLoading />
                ) : checklist ? (
                    <DocumentChecklistView checklist={checklist} />
                ) : (
                    <Alert>
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                            No document checklist exists for this tender yet.
                            <Button
                                className="mt-4"
                                onClick={() =>
                                    navigate(paths.tendering.documentChecklistCreate(tenderId!))
                                }
                            >
                                Create Checklist
                            </Button>
                        </AlertDescription>
                    </Alert>
                );

            case "costing":
                return costingSheetLoading ? (
                    <CostingSheetView costingSheet={null} isLoading />
                ) : costingSheet ? (
                    <CostingSheetView costingSheet={costingSheet} />
                ) : (
                    <Alert>
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                            No costing sheet exists for this tender yet.
                        </AlertDescription>
                    </Alert>
                );

            case "bid":
                return bidSubmissionLoading ? (
                    <BidSubmissionView bidSubmission={null} isLoading />
                ) : bidSubmission ? (
                    <BidSubmissionView bidSubmission={bidSubmission} />
                ) : (
                    <Alert>
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                            No bid submission exists for this tender yet.
                        </AlertDescription>
                    </Alert>
                );

            case "result":
                return resultLoading ? (
                    <TenderResultShow result={null as any} isLoading />
                ) : (
                    <TenderResultShow result={tenderResult as any} />
                );

            default:
                return null;
        }
    };

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
            onBack={() => navigate(paths.tendering.tenders)}
            backLabel="Back to Tenders"
            renderSectionContent={renderSectionContent}
        />
    );
}
