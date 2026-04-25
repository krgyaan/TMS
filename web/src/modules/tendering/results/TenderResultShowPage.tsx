import { useParams, useNavigate } from "react-router-dom";
import { useState, useCallback, useMemo } from "react";
import { useTenderResultByTenderId } from "@/hooks/api/useTenderResults";
import { useReverseAuction } from "@/hooks/api/useReverseAuctions";
import { useTender } from "@/hooks/api/useTenders";
import { useTenderApproval } from "@/hooks/api/useTenderApprovals";
import { useInfoSheet } from "@/hooks/api/useInfoSheets";
import { usePhysicalDocByTenderId } from "@/hooks/api/usePhysicalDocs";
import { useRfqByTenderId } from "@/hooks/api/useRfqs";
import { usePaymentRequestsByTender } from "@/hooks/api/useEmds";
import { useDocumentChecklistByTender } from "@/hooks/api/useDocumentChecklists";
import { useCostingSheetByTender } from "@/hooks/api/useCostingSheets";
import { useBidSubmissionByTender } from "@/hooks/api/useBidSubmissions";
import { paths } from "@/app/routes/paths";
import type { TenderWithRelations } from "@/modules/tendering/tenders/helpers/tenderInfo.types";
import { TenderView } from "@/modules/tendering/tenders/components/TenderView";
import { InfoSheetView } from "@/modules/tendering/info-sheet/components/InfoSheetView";
import { TenderApprovalView } from "@/modules/tendering/tender-approval/components/TenderApprovalView";
import { PhysicalDocsView } from "@/modules/tendering/physical-docs/components/PhysicalDocsView";
import { RfqView } from "@/modules/tendering/rfqs/components/RfqView";
import { EmdTenderFeeShow } from "@/modules/tendering/emds-tenderfees/components/EmdTenderFeeShow";
import { DocumentChecklistView } from "@/modules/tendering/checklists/components/DocumentChecklistView";
import { CostingSheetView } from "@/modules/tendering/costing-sheets/components/CostingSheetView";
import { BidSubmissionView } from "@/modules/tendering/bid-submissions/components/BidSubmissionView";
import { RaShow } from "@/modules/tendering/ras/components/RaShow";
import { TenderResultShow } from "./components/TenderResultShow";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import {
    ShowPageLayout,
    type StepConfig,
    type StepStatus,
} from "@/modules/tendering/components/ShowPageLayout";

export default function TenderResultShowPage() {
    const { tenderId } = useParams<{ tenderId: string }>();
    const navigate = useNavigate();
    const tenderIdNum = tenderId ? Number(tenderId) : null;

    // ── Data fetching ──
    const { data: result, isLoading: resultLoading } = useTenderResultByTenderId(tenderIdNum);
    const reverseAuctionId = result?.reverseAuctionId;
    const raApplicable = result?.raApplicable;

    const { data: tender, isLoading: tenderLoading } = useTender(tenderIdNum);
    const { data: approval, isLoading: approvalLoading } = useTenderApproval(tenderIdNum);
    const { data: infoSheet, isLoading: infoSheetLoading } = useInfoSheet(tenderIdNum);
    const { data: physicalDoc, isLoading: physicalDocLoading } = usePhysicalDocByTenderId(tenderIdNum);
    const { data: rfq, isLoading: rfqLoading } = useRfqByTenderId(tenderIdNum);
    const { data: paymentRequests, isLoading: requestsLoading } = usePaymentRequestsByTender(tenderIdNum);
    const { data: documentChecklist, isLoading: documentChecklistLoading } = useDocumentChecklistByTender(tenderIdNum ?? 0);
    const { data: costingSheet, isLoading: costingSheetLoading } = useCostingSheetByTender(tenderIdNum ?? 0);
    const { data: bidSubmission, isLoading: bidSubmissionLoading } = useBidSubmissionByTender(tenderIdNum ?? 0);

    const { data: ra, isLoading: raLoading } = useReverseAuction(
        raApplicable && reverseAuctionId ? reverseAuctionId : 0
    );

    const tenderWithRelations: TenderWithRelations | null = tender
        ? { ...tender, approval: approval || null }
        : null;

    const isLoading = resultLoading || tenderLoading || approvalLoading || infoSheetLoading || physicalDocLoading || rfqLoading || requestsLoading || documentChecklistLoading || costingSheetLoading || bidSubmissionLoading || (raApplicable && raLoading);

    // ── Derived details ──
    const resultDataForShow = useMemo(() => {
        const emdRequest = paymentRequests?.find(req => req.purpose === 'EMD');
        const emdInstrument = emdRequest?.instruments?.find((inst: any) => inst.isActive);
        const emdDetails = tender?.emd ? {
            amount: tender.emd,
            instrumentType: emdInstrument?.instrumentType || null,
            instrumentStatus: emdInstrument?.status || null,
            displayText: emdInstrument
                ? `${emdInstrument.instrumentType} (${emdInstrument.status})`
                : tender.emd ? 'Not Requested' : 'Not Applicable',
        } : null;

        return {
            ...result,
            bidSubmissionDate: bidSubmission?.submissionDatetime || null,
            finalPrice: result?.tenderValue || tender?.gstValues || null,
            resultStatus: result?.status || '',
            emdDetails,
        };
    }, [result, paymentRequests, tender, bidSubmission]);

    // ── Derive step statuses ──
    const steps: StepConfig[] = useMemo(() => {
        function getStatus(hasData: boolean, loading: boolean): StepStatus {
            if (loading) return "loading";
            if (hasData) return "completed";
            return "pending";
        }

        const baseSteps: StepConfig[] = [
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
                hasData: Array.isArray(rfq) && rfq.length > 0,
                isLoading: rfqLoading,
                status: getStatus(Array.isArray(rfq) && rfq.length > 0, rfqLoading),
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

        let currentStepNum = 8;
        if (raApplicable && reverseAuctionId) {
            baseSteps.push({
                id: "ra-management",
                label: "RA Management",
                shortLabel: "RA",
                stepNumber: currentStepNum++,
                hasData: !!ra,
                isLoading: raLoading,
                status: getStatus(!!ra, raLoading),
            });
        }

        baseSteps.push({
            id: "result",
            label: "Tender Result",
            shortLabel: "Result",
            stepNumber: currentStepNum,
            hasData: !!result,
            isLoading: resultLoading,
            status: getStatus(!!result, resultLoading),
        });

        return baseSteps;
    }, [
        tender, tenderLoading, approvalLoading, infoSheetLoading,
        physicalDoc, physicalDocLoading,
        rfq, rfqLoading,
        paymentRequests, requestsLoading,
        documentChecklist, documentChecklistLoading,
        costingSheet, costingSheetLoading,
        bidSubmission, bidSubmissionLoading,
        ra, raLoading, raApplicable, reverseAuctionId,
        result, resultLoading
    ]);

    // ── View state ──
    const [expandedSections, setExpandedSections] = useState<Set<string>>(
        new Set(["result"])
    );
    const [activeSection, setActiveSection] = useState("result");

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

            case "ra-management":
                return (
                    <RaShow
                        ra={ra as any}
                        isLoading={raLoading}
                    />
                );

            case "result":
                return (
                    <TenderResultShow
                        result={resultDataForShow as any}
                        isLoading={resultLoading}
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
            onBack={() => navigate(paths.tendering.results)}
            backLabel="Back to Results"
            renderSectionContent={renderSectionContent}
        />
    );
}
