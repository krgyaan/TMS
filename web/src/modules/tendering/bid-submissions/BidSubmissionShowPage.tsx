import { useParams, useNavigate } from "react-router-dom";
import { useState, useCallback, useMemo } from "react";
import { useTender } from "@/hooks/api/useTenders";
import { useTenderApproval } from "@/hooks/api/useTenderApprovals";
import { usePhysicalDocByTenderId } from "@/hooks/api/usePhysicalDocs";
import { usePaymentRequestsByTender } from "@/hooks/api/useEmds";
import { useDocumentChecklistByTender } from "@/hooks/api/useDocumentChecklists";
import { useCostingSheetByTender } from "@/hooks/api/useCostingSheets";
import { useBidSubmissionByTender } from "@/hooks/api/useBidSubmissions";
import { paths } from "@/app/routes/paths";
import { TenderDetailsSection } from "@/modules/tendering/tenders/components/TenderView";
import { PhysicalDocsSection } from "@/modules/tendering/physical-docs/components/PhysicalDocsView";
import { EmdTenderFeeSection } from "@/modules/tendering/emds-tenderfees/components/EmdTenderFeeShow";
import { DocumentChecklistSection } from "@/modules/tendering/checklists/components/DocumentChecklistView";
import { CostingSheetSection } from "@/modules/tendering/costing-sheets/components/CostingSheetView";
import { BidSubmissionSection } from "./components/BidSubmissionView";
import {
    ShowPageLayout,
    type StepConfig,
    type StepStatus,
} from "@/modules/tendering/components/ShowPageLayout";

export default function BidSubmissionShowPage() {
    const { tenderId: tenderIdParam } = useParams<{ tenderId: string }>();
    const navigate = useNavigate();
    const tenderId = tenderIdParam ? Number(tenderIdParam) : null;

    // ── Status-only queries (for step indicators) ──
    const { data: tender, isLoading } = useTender(tenderId);
    const { data: approval, isLoading: approvalLoading } = useTenderApproval(tenderId);
    const { data: physicalDoc, isLoading: physicalDocLoading } = usePhysicalDocByTenderId(tenderId);
    const { data: paymentRequests, isLoading: paymentRequestsLoading } = usePaymentRequestsByTender(tenderId);
    const { data: checklist, isLoading: checklistLoading } = useDocumentChecklistByTender(tenderId ?? 0);
    const { data: costingSheet, isLoading: costingSheetLoading } = useCostingSheetByTender(tenderId ?? 0);
    const { data: bidSubmission, isLoading: bidSubmissionLoading } = useBidSubmissionByTender(tenderId ?? 0);

    // ── Step status config ──
    const steps: StepConfig[] = useMemo(() => {
        function getStatus(hasData: boolean, loading: boolean): StepStatus {
            if (loading) return "loading";
            if (hasData) return "completed";
            return "pending";
        }
        return [
            { id: "tender-details", label: "Tender Details",    shortLabel: "Tender Details", stepNumber: 1, hasData: !!tender,           isLoading: isLoading || approvalLoading, status: getStatus(!!tender,           isLoading) },
            { id: "physical-docs",  label: "Physical Documents", shortLabel: "Physical Docs",  stepNumber: 2, hasData: !!physicalDoc,      isLoading: physicalDocLoading,           status: getStatus(!!physicalDoc,      physicalDocLoading) },
            { id: "emd-fees",       label: "EMD & Tender Fees",  shortLabel: "EMD / Fees",     stepNumber: 3, hasData: !!paymentRequests?.length, isLoading: paymentRequestsLoading, status: getStatus(!!paymentRequests?.length, paymentRequestsLoading) },
            { id: "checklist",      label: "Document Checklist", shortLabel: "Checklist",      stepNumber: 4, hasData: !!checklist,        isLoading: checklistLoading,             status: getStatus(!!checklist,        checklistLoading) },
            { id: "costing",        label: "Costing Sheet",      shortLabel: "Costing",        stepNumber: 5, hasData: !!costingSheet,     isLoading: costingSheetLoading,          status: getStatus(!!costingSheet,     costingSheetLoading) },
            { id: "bid",            label: "Bid Submission",     shortLabel: "Bid",            stepNumber: 6, hasData: !!bidSubmission,    isLoading: bidSubmissionLoading,         status: getStatus(!!bidSubmission,    bidSubmissionLoading) },
        ];
    }, [tender, isLoading, approvalLoading, physicalDoc, physicalDocLoading, paymentRequests, paymentRequestsLoading, checklist, checklistLoading, costingSheet, costingSheetLoading, bidSubmission, bidSubmissionLoading]);

    // ── View state ──
    const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(["bid"]));
    const [activeSection, setActiveSection] = useState("bid");

    const toggleSection = useCallback((id: string) => {
        setExpandedSections((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id); else next.add(id);
            return next;
        });
    }, []);
    const expandAll   = useCallback(() => setExpandedSections(new Set(steps.map((s) => s.id))), [steps]);
    const collapseAll = useCallback(() => setExpandedSections(new Set()), []);
    const jumpToSection = useCallback((id: string) => {
        setActiveSection(id);
        document.getElementById(`section-${id}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, []);

    const renderSectionContent = useCallback((stepId: string) => {
        switch (stepId) {
            case "tender-details": return <TenderDetailsSection tenderId={tenderId} />;
            case "physical-docs":  return <PhysicalDocsSection  tenderId={tenderId} />;
            case "emd-fees":       return <EmdTenderFeeSection  tenderId={tenderId} />;
            case "checklist":      return <DocumentChecklistSection tenderId={tenderId} />;
            case "costing":        return <CostingSheetSection  tenderId={tenderId} />;
            case "bid":            return <BidSubmissionSection  tenderId={tenderId} />;
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
