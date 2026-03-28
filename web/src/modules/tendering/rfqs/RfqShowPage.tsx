import { useNavigate, useParams } from 'react-router-dom';
import { useState, useCallback, useMemo } from 'react';
import { useTender } from '@/hooks/api/useTenders';
import { useTenderApproval } from '@/hooks/api/useTenderApprovals';
import { useInfoSheet } from '@/hooks/api/useInfoSheets';
import { usePhysicalDocByTenderId } from '@/hooks/api/usePhysicalDocs';
import { useRfqByTenderId } from '@/hooks/api/useRfqs';
import { useRfqResponses } from '@/hooks/api/useRfqResponses';
import { usePaymentRequestsByTender } from '@/hooks/api/useEmds';
import { useDocumentChecklistByTender } from '@/hooks/api/useDocumentChecklists';
import { useCostingSheetByTender } from '@/hooks/api/useCostingSheets';
import { useBidSubmissionByTender } from '@/hooks/api/useBidSubmissions';
import { paths } from "@/app/routes/paths";
import { TenderView } from '@/modules/tendering/tenders/components/TenderView';
import { InfoSheetView } from '@/modules/tendering/info-sheet/components/InfoSheetView';
import { TenderApprovalView } from '@/modules/tendering/tender-approval/components/TenderApprovalView';
import { PhysicalDocsView } from '@/modules/tendering/physical-docs/components/PhysicalDocsView';
import { RfqView } from './components/RfqView';
import { RfqResponseDetailAccordion } from '@/modules/tendering/rfq-response/components/RfqResponseDetailAccordion';
import { EmdTenderFeeShow } from '@/modules/tendering/emds-tenderfees/components/EmdTenderFeeShow';
import { DocumentChecklistView } from '@/modules/tendering/checklists/components/DocumentChecklistView';
import { CostingSheetView } from '@/modules/tendering/costing-sheets/components/CostingSheetView';
import { BidSubmissionView } from '@/modules/tendering/bid-submissions/components/BidSubmissionView';
import type { TenderWithRelations, TenderInfoWithNames } from '@/modules/tendering/tenders/helpers/tenderInfo.types';
import type { Rfq } from '@/modules/tendering/rfqs/helpers/rfq.types';
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, List, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    ShowPageLayout,
    type StepConfig,
    type StepStatus,
} from "@/modules/tendering/components/ShowPageLayout";

// Local component for RFQ item with its responses
function RfqItemWithResponses({ rfq, tender }: { rfq: Rfq; tender?: TenderInfoWithNames }) {
    const navigate = useNavigate();
    const { data: rfqResponses = [], isLoading: rfqResponsesLoading } = useRfqResponses(rfq.id);

    return (
        <div className="space-y-3 mb-8 last:mb-0">
            <RfqView
                rfq={rfq}
                tender={tender}
                isLoading={false}
            />
            <div className="flex items-center justify-between mt-6">
                <h3 className="text-lg font-semibold">RFQ Responses</h3>
                {rfq.id != null && (
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigate(paths.tendering.rfqsResponseList(rfq.id))}
                    >
                        <List className="h-4 w-4 mr-2" />
                        View all
                    </Button>
                )}
            </div>

            <div className="space-y-4">
                {rfqResponsesLoading ? (
                    <div className="flex items-center justify-center py-6 text-muted-foreground text-sm">
                        Loading responses…
                    </div>
                ) : rfqResponses.length === 0 ? (
                    <div className="flex flex-col items-center justify-center p-8 bg-muted/10 border border-dashed rounded-lg text-muted-foreground w-full">
                        <FileText className="h-10 w-10 mb-3 opacity-20" />
                        <p className="font-medium">No responses yet</p>
                    </div>
                ) : (
                    rfqResponses.map((res) => (
                        <RfqResponseDetailAccordion
                            key={res.id}
                            responseSummary={res}
                        />
                    ))
                )}
            </div>
        </div>
    );
}

export default function RfqShowPage() {
    const navigate = useNavigate();
    const { tenderId: tenderIdParam } = useParams<{ tenderId: string }>();
    const tenderId = tenderIdParam ? Number(tenderIdParam) : null;

    // ── Data fetching ──
    const { data: tender, isLoading: tenderLoading } = useTender(tenderId);
    const { data: approval, isLoading: approvalLoading } = useTenderApproval(tenderId);
    const { data: infoSheet, isLoading: infoSheetLoading } = useInfoSheet(tenderId);
    const { data: physicalDoc, isLoading: physicalDocLoading } = usePhysicalDocByTenderId(tenderId);
    const { data: rfqData, isLoading: rfqLoading } = useRfqByTenderId(tenderId);
    const { data: paymentRequests, isLoading: requestsLoading } = usePaymentRequestsByTender(tenderId);
    const { data: documentChecklist, isLoading: documentChecklistLoading } = useDocumentChecklistByTender(tenderId ?? 0);
    const { data: costingSheet, isLoading: costingSheetLoading } = useCostingSheetByTender(tenderId ?? 0);
    const { data: bidSubmission, isLoading: bidSubmissionLoading } = useBidSubmissionByTender(tenderId ?? 0);

    const tenderWithRelations: TenderWithRelations | null = tender
        ? { ...tender, approval: approval || null }
        : null;

    const isLoading = tenderLoading || approvalLoading || rfqLoading;

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
                id: "rfq",
                label: "RFQ & Responses",
                shortLabel: "RFQ",
                stepNumber: 3,
                hasData: Array.isArray(rfqData) && rfqData.length > 0,
                isLoading: rfqLoading,
                status: getStatus(Array.isArray(rfqData) && rfqData.length > 0, rfqLoading),
            },
            {
                id: "emd-fees",
                label: "EMD & Tender Fees",
                shortLabel: "EMD / Fees",
                stepNumber: 4,
                hasData: !!paymentRequests && paymentRequests.length > 0,
                isLoading: requestsLoading,
                status: getStatus(!!paymentRequests && paymentRequests.length > 0, requestsLoading),
            },
            {
                id: "checklist",
                label: "Document Checklist",
                shortLabel: "Checklist",
                stepNumber: 5,
                hasData: !!documentChecklist,
                isLoading: documentChecklistLoading,
                status: getStatus(!!documentChecklist, documentChecklistLoading),
            },
            {
                id: "costing",
                label: "Costing Sheet",
                shortLabel: "Costing",
                stepNumber: 6,
                hasData: !!costingSheet,
                isLoading: costingSheetLoading,
                status: getStatus(!!costingSheet, costingSheetLoading),
            },
            {
                id: "bid-submission",
                label: "Bid Submission",
                shortLabel: "Bid",
                stepNumber: 7,
                hasData: !!bidSubmission,
                isLoading: bidSubmissionLoading,
                status: getStatus(!!bidSubmission, bidSubmissionLoading),
            },
        ];
    }, [
        tender, tenderLoading, approvalLoading, infoSheetLoading,
        physicalDoc, physicalDocLoading,
        rfqData, rfqLoading,
        paymentRequests, requestsLoading,
        documentChecklist, documentChecklistLoading,
        costingSheet, costingSheetLoading,
        bidSubmission, bidSubmissionLoading,
    ]);

    // ── View state ──
    const [expandedSections, setExpandedSections] = useState<Set<string>>(
        new Set(["rfq"])
    );
    const [activeSection, setActiveSection] = useState("rfq");

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

            case "rfq":
                return rfqLoading ? (
                    <RfqView rfq={null} tender={tender || undefined} isLoading={true} />
                ) : !rfqData || rfqData.length === 0 ? (
                    <RfqView rfq={null} tender={tender || undefined} isLoading={false} />
                ) : (
                    <div className="space-y-8">
                        {rfqData.map((rfq) => (
                            <RfqItemWithResponses
                                key={rfq.id}
                                rfq={rfq}
                                tender={tender || undefined}
                            />
                        ))}
                    </div>
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
                        checklist={documentChecklist || null}
                        isLoading={documentChecklistLoading}
                    />
                );

            case "costing":
                return (
                    <CostingSheetView
                        costingSheet={costingSheet || null}
                        isLoading={costingSheetLoading}
                    />
                );

            case "bid-submission":
                return (
                    <BidSubmissionView
                        bidSubmission={bidSubmission || null}
                        isLoading={bidSubmissionLoading}
                    />
                );

            default:
                return null;
        }
    };

    if (!tenderIdParam) {
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
            onBack={() => navigate(paths.tendering.rfqs)}
            backLabel="Back to RFQs"
            renderSectionContent={renderSectionContent}
        />
    );
}
