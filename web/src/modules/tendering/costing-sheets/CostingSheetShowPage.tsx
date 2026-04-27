import { useParams, useNavigate } from "react-router-dom";
import { useState, useCallback } from "react";
import { useTenderStepStatuses } from "@/hooks/api/useTenderStepStatuses";
import { TenderDetailsSection } from "@/modules/tendering/tenders/components/TenderView";
import { PhysicalDocsSection } from "@/modules/tendering/physical-docs/components/PhysicalDocsView";
import { RfqSection } from "@/modules/tendering/rfqs/components/RfqView";
import { EmdTenderFeeSection } from "@/modules/tendering/emds-tenderfees/components/EmdTenderFeeShow";
import { DocumentChecklistSection } from "@/modules/tendering/checklists/components/DocumentChecklistView";
import { CostingSheetSection } from "./components/CostingSheetView";
import { BidSubmissionSection } from "@/modules/tendering/bid-submissions/components/BidSubmissionView";
import { paths } from "@/app/routes/paths";
import { ShowPageLayout } from "@/components/layout/ShowPageLayout";

// CostingSheet page shows all steps EXCEPT "result"
const STEP_IDS = ["tender-details", "physical-docs", "rfq", "emd-fees", "checklist", "costing", "bid"];

export default function CostingSheetShowPage() {
    const { tenderId: tenderIdParam } = useParams<{ tenderId: string }>();
    const navigate = useNavigate();
    const tenderId = tenderIdParam ? Number(tenderIdParam) : null;

    const { steps: allSteps } = useTenderStepStatuses(tenderId);
    const steps = allSteps.filter((s) => STEP_IDS.includes(s.id));

    const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(["costing"]));

    const toggleSection = useCallback((id: string) => {
        setExpandedSections((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id); else next.add(id);
            return next;
        });
    }, []);
    const expandAll   = useCallback(() => setExpandedSections(new Set(steps.map((s) => s.id))), [steps]);
    const collapseAll = useCallback(() => setExpandedSections(new Set()), []);

    const renderSectionContent = useCallback((stepId: string) => {
        switch (stepId) {
            case "tender-details": return <TenderDetailsSection tenderId={tenderId} />;
            case "physical-docs":  return <PhysicalDocsSection  tenderId={tenderId} />;
            case "rfq":            return <RfqSection           tenderId={tenderId} />;
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
