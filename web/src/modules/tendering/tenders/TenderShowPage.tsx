import { useParams, useNavigate } from "react-router-dom";
import { useState, useCallback, useMemo } from "react";
import { useTender } from "@/hooks/api/useTenders";
import { useTenderApproval } from "@/hooks/api/useTenderApprovals";
import { usePhysicalDocByTenderId } from "@/hooks/api/usePhysicalDocs";
import { useRfqByTenderId } from "@/hooks/api/useRfqs";
import { usePaymentRequestsByTender } from "@/hooks/api/useEmds";
import { useDocumentChecklistByTender } from "@/hooks/api/useDocumentChecklists";
import { useCostingSheetByTender } from "@/hooks/api/useCostingSheets";
import { useBidSubmissionByTender } from "@/hooks/api/useBidSubmissions";
import { useTenderResultByTenderId } from "@/hooks/api/useTenderResults";
import { TenderDetailsSection } from "@/modules/tendering/tenders/components/TenderView";
import { PhysicalDocsSection } from "@/modules/tendering/physical-docs/components/PhysicalDocsView";
import { RfqSection } from "@/modules/tendering/rfqs/components/RfqView";
import { EmdTenderFeeSection } from "@/modules/tendering/emds-tenderfees/components/EmdTenderFeeShow";
import { DocumentChecklistSection } from "@/modules/tendering/checklists/components/DocumentChecklistView";
import { CostingSheetSection } from "@/modules/tendering/costing-sheets/components/CostingSheetView";
import { BidSubmissionSection } from "@/modules/tendering/bid-submissions/components/BidSubmissionView";
import { TenderResultSection } from "@/modules/tendering/results/components/TenderResultShow";
import { paths } from "@/app/routes/paths";
import {
    ShowPageLayout,
    type StepConfig,
    type StepStatus,
} from "@/modules/tendering/components/ShowPageLayout";

export default function TenderShowPage() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const tenderId = id ? Number(id) : null;

    // ── Status-only queries (for step indicators) ──
    const { data: tender, isLoading } = useTender(tenderId);
    const { data: approval, isLoading: approvalLoading } = useTenderApproval(tenderId);
    const { data: physicalDoc, isLoading: physicalDocLoading } = usePhysicalDocByTenderId(tenderId);
    const { data: rfq, isLoading: rfqLoading } = useRfqByTenderId(tenderId);
    const { data: paymentRequests, isLoading: paymentRequestsLoading } = usePaymentRequestsByTender(tenderId);
    const { data: checklist, isLoading: checklistLoading } = useDocumentChecklistByTender(tenderId ?? 0);
    const { data: costingSheet, isLoading: costingSheetLoading } = useCostingSheetByTender(tenderId ?? 0);
    const { data: bidSubmission, isLoading: bidSubmissionLoading } = useBidSubmissionByTender(tenderId ?? 0);
    const { data: tenderResult, isLoading: resultLoading } = useTenderResultByTenderId(tenderId);

    // ── Step status config ──
    const steps: StepConfig[] = useMemo(() => {
        function getStatus(hasData: boolean, loading: boolean): StepStatus {
            if (loading) return "loading";
            if (hasData) return "completed";
            return "pending";
        }
        return [
            { id: "tender-details",  label: "Tender Details",      shortLabel: "Tender Details", stepNumber: 1, hasData: !!tender,          isLoading: isLoading || approvalLoading,    status: getStatus(!!tender,          isLoading) },
            { id: "physical-docs",   label: "Physical Documents",   shortLabel: "Physical Docs",  stepNumber: 2, hasData: !!physicalDoc,     isLoading: physicalDocLoading,              status: getStatus(!!physicalDoc,     physicalDocLoading) },
            { id: "rfq",             label: "RFQ & Responses",      shortLabel: "RFQ",            stepNumber: 3, hasData: Array.isArray(rfq) && rfq.length > 0, isLoading: rfqLoading, status: getStatus(Array.isArray(rfq) && rfq.length > 0, rfqLoading) },
            { id: "emd-fees",        label: "EMD & Tender Fees",    shortLabel: "EMD / Fees",     stepNumber: 4, hasData: !!paymentRequests?.length, isLoading: paymentRequestsLoading, status: getStatus(!!paymentRequests?.length, paymentRequestsLoading) },
            { id: "checklist",       label: "Document Checklist",   shortLabel: "Checklist",      stepNumber: 5, hasData: !!checklist,       isLoading: checklistLoading,                status: getStatus(!!checklist,       checklistLoading) },
            { id: "costing",         label: "Costing Sheet",        shortLabel: "Costing",        stepNumber: 6, hasData: !!costingSheet,    isLoading: costingSheetLoading,             status: getStatus(!!costingSheet,    costingSheetLoading) },
            { id: "bid",             label: "Bid Submission",       shortLabel: "Bid",            stepNumber: 7, hasData: !!bidSubmission,   isLoading: bidSubmissionLoading,            status: getStatus(!!bidSubmission,   bidSubmissionLoading) },
            { id: "result",          label: "Result",               shortLabel: "Result",         stepNumber: 8, hasData: !!tenderResult,    isLoading: resultLoading,                   status: getStatus(!!tenderResult,    resultLoading) },
        ];
    }, [tender, isLoading, approvalLoading, physicalDoc, physicalDocLoading, rfq, rfqLoading, paymentRequests, paymentRequestsLoading, checklist, checklistLoading, costingSheet, costingSheetLoading, bidSubmission, bidSubmissionLoading, tenderResult, resultLoading]);

    // ── View state ──
    const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(["tender-details"]));
    const [activeSection, setActiveSection] = useState("tender-details");

    const toggleSection = useCallback((id: string) => {
        setExpandedSections((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id); else next.add(id);
            return next;
        });
    }, []);
    const expandAll  = useCallback(() => setExpandedSections(new Set(steps.map((s) => s.id))), [steps]);
    const collapseAll = useCallback(() => setExpandedSections(new Set()), []);
    const jumpToSection = useCallback((id: string) => {
        setActiveSection(id);
        document.getElementById(`section-${id}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, []);

    // ── Section content — one line per section ──
    const renderSectionContent = useCallback((stepId: string) => {
        switch (stepId) {
            case "tender-details": return <TenderDetailsSection tenderId={tenderId} />;
            case "physical-docs":  return <PhysicalDocsSection  tenderId={tenderId} />;
            case "rfq":            return <RfqSection           tenderId={tenderId} />;
            case "emd-fees":       return <EmdTenderFeeSection  tenderId={tenderId} />;
            case "checklist":      return <DocumentChecklistSection tenderId={tenderId} />;
            case "costing":        return <CostingSheetSection  tenderId={tenderId} />;
            case "bid":            return <BidSubmissionSection  tenderId={tenderId} />;
            case "result":         return <TenderResultSection   tenderId={tenderId} />;
            default:               return null;
        }
    }, [tenderId]);

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
