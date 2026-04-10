import { useParams, useNavigate } from 'react-router-dom';
import { useState, useCallback, useMemo } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import { useTqById, useTqItems } from '@/hooks/api/useTqManagement';
import { useTender } from '@/hooks/api/useTenders';
import { useTenderApproval } from '@/hooks/api/useTenderApprovals';
import { useInfoSheet } from '@/hooks/api/useInfoSheets';
import { usePhysicalDocByTenderId } from '@/hooks/api/usePhysicalDocs';
import { usePaymentRequestsByTender } from '@/hooks/api/useEmds';
import { useDocumentChecklistByTender } from '@/hooks/api/useDocumentChecklists';
import { useCostingSheetByTender } from '@/hooks/api/useCostingSheets';
import { useBidSubmissionByTender } from '@/hooks/api/useBidSubmissions';
import { useTqTypes } from '@/hooks/api/useTqTypes';
import { paths } from '@/app/routes/paths';
import { TenderView } from '@/modules/tendering/tenders/components/TenderView';
import { InfoSheetView } from '@/modules/tendering/info-sheet/components/InfoSheetView';
import { TenderApprovalView } from '@/modules/tendering/tender-approval/components/TenderApprovalView';
import { PhysicalDocsView } from '@/modules/tendering/physical-docs/components/PhysicalDocsView';
import { EmdTenderFeeShow } from '@/modules/tendering/emds-tenderfees/components/EmdTenderFeeShow';
import { DocumentChecklistView } from '@/modules/tendering/checklists/components/DocumentChecklistView';
import { CostingSheetView } from '@/modules/tendering/costing-sheets/components/CostingSheetView';
import { BidSubmissionView } from '@/modules/tendering/bid-submissions/components/BidSubmissionView';
import { TqView } from './components/TqView';
import type { TenderWithRelations } from '@/modules/tendering/tenders/helpers/tenderInfo.types';
import {
    ShowPageLayout,
    type StepConfig,
    type StepStatus,
} from "@/modules/tendering/components/ShowPageLayout";

export default function TqViewPage() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const tqId = id ? parseInt(id, 10) : 0;

    // ── Primary data fetching ──
    const { data: tqData, isLoading: tqLoading, error: tqError } = useTqById(tqId);
    const tenderId = tqData?.tenderId || null;

    // ── Related tender data fetching ──
    const { data: tender, isLoading: tenderLoading } = useTender(tenderId ?? 0);
    const { data: approval, isLoading: approvalLoading } = useTenderApproval(tenderId ?? 0);
    const { data: infoSheet, isLoading: infoSheetLoading } = useInfoSheet(tenderId ?? 0);
    const { data: physicalDoc, isLoading: physicalDocLoading } = usePhysicalDocByTenderId(tenderId ?? 0);
    const { data: paymentRequests, isLoading: requestsLoading } = usePaymentRequestsByTender(tenderId ?? 0);
    const { data: documentChecklist, isLoading: documentChecklistLoading } = useDocumentChecklistByTender(tenderId ?? 0);
    const { data: costingSheet, isLoading: costingSheetLoading } = useCostingSheetByTender(tenderId ?? 0);
    const { data: bidSubmission, isLoading: bidSubmissionLoading } = useBidSubmissionByTender(tenderId ?? 0);
    const { data: tqItems, isLoading: itemsLoading } = useTqItems(tqId);
    const { data: tqTypes } = useTqTypes();

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
                isLoading: bidSubmissionLoading,
                status: getStatus(!!bidSubmission, bidSubmissionLoading),
            },
            {
                id: "tq-management",
                label: "TQ Management",
                shortLabel: "TQ",
                stepNumber: 7,
                hasData: !!tqData,
                isLoading: tqLoading || itemsLoading,
                status: getStatus(!!tqData, tqLoading),
            },
        ];
    }, [
        tender, tenderLoading, approvalLoading, infoSheetLoading,
        physicalDoc, physicalDocLoading,
        paymentRequests, requestsLoading,
        documentChecklist, documentChecklistLoading,
        costingSheet, costingSheetLoading,
        bidSubmission, bidSubmissionLoading,
        tqData, tqLoading, itemsLoading
    ]);

    // ── View state ──
    const [expandedSections, setExpandedSections] = useState<Set<string>>(
        new Set(["tq-management"])
    );
    const [activeSection, setActiveSection] = useState("tq-management");

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

            case "tq-management":
                return (
                    <TqView
                        tqData={tqData!}
                        tqItems={tqItems || null}
                        tqTypes={tqTypes || null}
                        isLoading={tqLoading || itemsLoading}
                    />
                );

            default:
                return null;
        }
    };

    if (!tqId) {
        return (
            <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>Invalid TQ ID</AlertDescription>
            </Alert>
        );
    }

    if (tqError) {
        return (
            <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Error loading TQ</AlertTitle>
                <AlertDescription>{tqError.message}</AlertDescription>
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
            onBack={() => navigate(paths.tendering.tqManagement)}
            backLabel="Back to TQ Management"
            renderSectionContent={renderSectionContent}
        />
    );
}
