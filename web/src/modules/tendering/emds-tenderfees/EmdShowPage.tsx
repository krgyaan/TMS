import { useParams, useNavigate } from "react-router-dom";
import { useState, useCallback } from "react";
import { paths } from "@/app/routes/paths";
import { TenderDetailsSection } from "@/modules/tendering/tenders/components/TenderView";
import { PhysicalDocsSection } from "@/modules/tendering/physical-docs/components/PhysicalDocsView";
import { RfqSection } from "@/modules/tendering/rfqs/components/RfqView";
import { EmdTenderFeeSection } from "@/modules/tendering/emds-tenderfees/components/EmdTenderFeeShow";
import { PaymentInstrumentView } from "@/modules/tendering/emds-tenderfees/components/PaymentInstrumentView";
import { DocumentChecklistSection } from "@/modules/tendering/checklists/components/DocumentChecklistView";
import { CostingSheetSection } from "@/modules/tendering/costing-sheets/components/CostingSheetView";
import { BidSubmissionSection } from "@/modules/tendering/bid-submissions/components/BidSubmissionView";
import { RaSection } from "@/modules/tendering/ras/components/RaShow";
import { TqTenderSection } from "@/modules/tendering/tq-management/components/TqView";
import { TenderResultSection } from "@/modules/tendering/results/components/TenderResultView";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { ShowPageLayout } from "@/components/layout/ShowPageLayout";
import { useTenderStepStatuses } from "@/hooks/api/useTenderStepStatuses";

export default function EmdShowPage() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const tenderId = id ? Number(id) : null;

    const isNonTmsEntry = tenderId === 0;

    const { steps: tenderSteps } = useTenderStepStatuses(isNonTmsEntry ? null : tenderId);

    const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(["emd-fees"]));

    const toggleSection = useCallback((id: string) => {
        setExpandedSections((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    }, []);

    const expandAll = useCallback(() => setExpandedSections(new Set(tenderSteps.map((s) => s.id))), [tenderSteps]);
    const collapseAll = useCallback(() => setExpandedSections(new Set()), []);

    const renderSectionContent = (stepId: string) => {
        if (isNonTmsEntry) {
            if (stepId === "emd-fees") {
                return <PaymentInstrumentView paymentRequestId={tenderId!} />;
            }
            return null;
        }

        if (!tenderId) return null;
        switch (stepId) {
            case "tender-details":   return <TenderDetailsSection tenderId={tenderId} />;
            case "physical-docs":    return <PhysicalDocsSection tenderId={tenderId} />;
            case "rfq":              return <RfqSection tenderId={tenderId} />;
            case "emd-fees":         return <EmdTenderFeeSection tenderId={tenderId} />;
            case "checklist":        return <DocumentChecklistSection tenderId={tenderId} />;
            case "costing":          return <CostingSheetSection tenderId={tenderId} />;
            case "bid":              return <BidSubmissionSection tenderId={tenderId} />;
            case "tq-management":    return <TqTenderSection tenderId={tenderId} />;
            case "ra-management":    return <RaSection tenderId={tenderId} />;
            case "result":           return <TenderResultSection tenderId={tenderId} />;
            default: return null;
        }
    };

    if (tenderId === null || tenderId === undefined) {
        return (
            <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>Invalid Tender ID.</AlertDescription>
            </Alert>
        );
    }

    if (isNonTmsEntry) {
        return (
            <ShowPageLayout
                steps={[{
                    id: 'emd-fees', label: 'Payment Request',
                    shortLabel: "",
                    stepNumber: 0,
                    status: "completed",
                    hasData: false,
                    isLoading: false
                }]}
                expandedSections={expandedSections}
                onToggleSection={toggleSection}
                onExpandAll={() => setExpandedSections(new Set(['emd-fees']))}
                onCollapseAll={() => setExpandedSections(new Set())}
                onBack={() => navigate(paths.tendering.emdsTenderFees)}
                backLabel="Back to EMD / Tender Fees"
                renderSectionContent={renderSectionContent}
            />
        );
    }

    return (
        <ShowPageLayout
            steps={tenderSteps.filter(s => ["tender-details", "physical-docs", "rfq", "emd-fees", "checklist", "costing", "bid", "tq-management", "ra-management", "result"].includes(s.id))}
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