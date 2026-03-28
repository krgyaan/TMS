import { useParams, useNavigate } from 'react-router-dom';
import { useState, useCallback, useMemo } from 'react';
import { SubmitQueryView } from './components/SubmitQueryView';
import { useSubmitQuery } from '@/hooks/api/useSubmitQuery';
import { useTender } from '@/hooks/api/useTenders';
import { useTenderApproval } from '@/hooks/api/useTenderApprovals';
import { useInfoSheet } from '@/hooks/api/useInfoSheets';
import { usePhysicalDocByTenderId } from '@/hooks/api/usePhysicalDocs';
import { useRfqByTenderId } from '@/hooks/api/useRfqs';
import { usePaymentRequestsByTender } from '@/hooks/api/useEmds';
import { useDocumentChecklistByTender } from '@/hooks/api/useDocumentChecklists';
import { useCostingSheetByTender } from '@/hooks/api/useCostingSheets';
import { useBidSubmissionByTender } from '@/hooks/api/useBidSubmissions';
import { paths } from '@/app/routes/paths';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import { TenderView } from '@/modules/tendering/tenders/components/TenderView';
import { InfoSheetView } from '@/modules/tendering/info-sheet/components/InfoSheetView';
import { TenderApprovalView } from '@/modules/tendering/tender-approval/components/TenderApprovalView';
import { PhysicalDocsView } from '@/modules/tendering/physical-docs/components/PhysicalDocsView';
import { RfqView } from '@/modules/tendering/rfqs/components/RfqView';
import { EmdTenderFeeShow } from '@/modules/tendering/emds-tenderfees/components/EmdTenderFeeShow';
import { DocumentChecklistView } from '@/modules/tendering/checklists/components/DocumentChecklistView';
import { CostingSheetView } from '@/modules/tendering/costing-sheets/components/CostingSheetView';
import { BidSubmissionView } from '@/modules/tendering/bid-submissions/components/BidSubmissionView';
import type { TenderWithRelations } from '@/modules/tendering/tenders/helpers/tenderInfo.types';
import {
    ShowPageLayout,
    type StepConfig,
    type StepStatus,
} from "@/modules/tendering/components/ShowPageLayout";

export function SubmitQueryViewPage() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const submitQueryId = id ? parseInt(id, 10) : 0;

    // ── Primary data fetching ──
    const { data: queryData, isLoading: queryLoading, error: queryError } = useSubmitQuery(submitQueryId);
    const tenderId = queryData?.tenderId || null;

    // ── Related tender data fetching ──
    const { data: tender, isLoading: tenderLoading } = useTender(tenderId);
    const { data: approval, isLoading: approvalLoading } = useTenderApproval(tenderId);
    const { data: infoSheet, isLoading: infoSheetLoading } = useInfoSheet(tenderId);
    const { data: physicalDoc, isLoading: physicalDocLoading } = usePhysicalDocByTenderId(tenderId);
    const { data: rfq, isLoading: rfqLoading } = useRfqByTenderId(tenderId);
    const { data: paymentRequests, isLoading: requestsLoading } = usePaymentRequestsByTender(tenderId);
    const { data: documentChecklist, isLoading: documentChecklistLoading } = useDocumentChecklistByTender(tenderId ?? 0);
    const { data: costingSheet, isLoading: costingSheetLoading } = useCostingSheetByTender(tenderId ?? 0);
    const { data: bidSubmission, isLoading: bidSubmissionLoading } = useBidSubmissionByTender(tenderId ?? 0);

    const tenderWithRelations: TenderWithRelations | null = tender
        ? { ...tender, approval: approval || null }
        : null;

    const isLoading = queryLoading || (tenderId ? (tenderLoading || approvalLoading) : false);

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
                id: "submit-query",
                label: "Submit Query",
                shortLabel: "Query",
                stepNumber: 3,
                hasData: !!queryData,
                isLoading: queryLoading,
                status: getStatus(!!queryData, queryLoading),
            },
            {
                id: "rfq",
                label: "RFQ & Responses",
                shortLabel: "RFQ",
                stepNumber: 4,
                hasData: Array.isArray(rfq) && rfq.length > 0,
                isLoading: rfqLoading,
                status: getStatus(Array.isArray(rfq) && rfq.length > 0, rfqLoading),
            },
            {
                id: "emd-fees",
                label: "EMD & Tender Fees",
                shortLabel: "EMD / Fees",
                stepNumber: 5,
                hasData: !!paymentRequests && paymentRequests.length > 0,
                isLoading: requestsLoading,
                status: getStatus(!!paymentRequests && paymentRequests.length > 0, requestsLoading),
            },
            {
                id: "checklist",
                label: "Document Checklist",
                shortLabel: "Checklist",
                stepNumber: 6,
                hasData: !!documentChecklist,
                isLoading: documentChecklistLoading,
                status: getStatus(!!documentChecklist, documentChecklistLoading),
            },
            {
                id: "costing",
                label: "Costing Sheet",
                shortLabel: "Costing",
                stepNumber: 7,
                hasData: !!costingSheet,
                isLoading: costingSheetLoading,
                status: getStatus(!!costingSheet, costingSheetLoading),
            },
            {
                id: "bid-submission",
                label: "Bid Submission",
                shortLabel: "Bid",
                stepNumber: 8,
                hasData: !!bidSubmission,
                isLoading: bidSubmissionLoading,
                status: getStatus(!!bidSubmission, bidSubmissionLoading),
            },
        ];
    }, [
        tender, tenderLoading, approvalLoading, infoSheetLoading,
        physicalDoc, physicalDocLoading,
        queryData, queryLoading,
        rfq, rfqLoading,
        paymentRequests, requestsLoading,
        documentChecklist, documentChecklistLoading,
        costingSheet, costingSheetLoading,
        bidSubmission, bidSubmissionLoading,
    ]);

    // ── View state ──
    const [expandedSections, setExpandedSections] = useState<Set<string>>(
        new Set(["submit-query"])
    );
    const [activeSection, setActiveSection] = useState("submit-query");

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
                        ) : tenderLoading ? (
                            <div className="animate-pulse h-48 bg-muted rounded-lg" />
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

            case "submit-query":
                return (
                    <SubmitQueryView
                        data={queryData!}
                        isLoading={queryLoading}
                        error={queryError}
                    />
                );

            case "rfq":
                return (
                    <RfqView
                        rfq={Array.isArray(rfq) && rfq.length > 0 ? rfq[0] : null}
                        tender={tender ?? undefined}
                        isLoading={rfqLoading}
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

    if (!submitQueryId) {
        return (
            <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>Invalid Submit Query ID</AlertDescription>
            </Alert>
        );
    }

    if (queryError) {
        return (
            <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Error loading query</AlertTitle>
                <AlertDescription>{queryError.message}</AlertDescription>
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
            onBack={() => navigate(paths.tendering.submitQuery)}
            backLabel="Back to Submit Queries"
            renderSectionContent={renderSectionContent}
        />
    );
}

export default SubmitQueryViewPage;
