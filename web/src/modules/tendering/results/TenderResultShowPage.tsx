import { useParams, useNavigate } from "react-router-dom";
import { useState, useCallback } from "react";
import { paths } from "@/app/routes/paths";
import { TenderDetailsSection } from "@/modules/tendering/tenders/components/TenderView";
import { PhysicalDocsSection } from "@/modules/tendering/physical-docs/components/PhysicalDocsView";
import { RfqSection } from "@/modules/tendering/rfqs/components/RfqView";
import { EmdTenderFeeSection } from "@/modules/tendering/emds-tenderfees/components/EmdTenderFeeShow";
import { DocumentChecklistSection } from "@/modules/tendering/checklists/components/DocumentChecklistView";
import { CostingSheetSection } from "@/modules/tendering/costing-sheets/components/CostingSheetView";
import { BidSubmissionSection } from "@/modules/tendering/bid-submissions/components/BidSubmissionView";
import { RaSection } from "@/modules/tendering/ras/components/RaShow";
import { TenderResultSection } from "./components/TenderResultView";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { ShowPageLayout } from "@/components/layout/ShowPageLayout";
import { useTenderStepStatuses } from "@/hooks/api/useTenderStepStatuses";
import { BasicDetailsSection } from "@/modules/operations/wo-basic-details/components/BasicDetailsSection";
import { useWoBasicDetailsByTender } from "@/hooks/api/useWoBasicDetails";

export default function TenderResultShowPage() {
    const { tenderId } = useParams<{ tenderId: string }>();
    const navigate = useNavigate();
    const tenderIdNum = tenderId ? Number(tenderId) : null;

    const basicDetailsId = useWoBasicDetailsByTender(tenderIdNum ?? 0)?.data?.[0]?.id;

    const { steps: tenderSteps } = useTenderStepStatuses(tenderIdNum);
    const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(["result", "basic-details"]));

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
        if (!tenderIdNum) return null;
        switch (stepId) {
            case "tender-details": return <TenderDetailsSection tenderId={tenderIdNum} />;
            case "physical-docs":  return <PhysicalDocsSection tenderId={tenderIdNum} />;
            case "rfq":            return <RfqSection tenderId={tenderIdNum} />;
            case "emd-fees":       return <EmdTenderFeeSection tenderId={tenderIdNum} />;
            case "checklist":      return <DocumentChecklistSection tenderId={tenderIdNum} />;
            case "costing":        return <CostingSheetSection tenderId={tenderIdNum} />;
            case "bid":            return <BidSubmissionSection tenderId={tenderIdNum} />;
            case "ra-management":  return <RaSection tenderId={tenderIdNum} />;
            case "result":         return <TenderResultSection tenderId={tenderIdNum} />;
            case "basic-details":  return basicDetailsId ? <BasicDetailsSection woBasicDetailId={basicDetailsId} /> : null;
            default: return null;
        }
    };

    if (!tenderIdNum) {
        return (
            <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>Invalid Tender ID.</AlertDescription>
            </Alert>
        );
    }

    return (
        <ShowPageLayout
            steps={tenderSteps.filter(s => [
                "tender-details", 
                "physical-docs", 
                "rfq", 
                "emd-fees", 
                "checklist", 
                "costing", 
                "bid", 
                "ra-management", 
                "result", 
                "basic-details"
            ].includes(s.id))}
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
