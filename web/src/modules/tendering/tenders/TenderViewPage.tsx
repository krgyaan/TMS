import { useState, useCallback } from "react";
import { useTenderStepStatuses } from "@/hooks/api/useTenderStepStatuses";
import { TenderDetailsSection } from "@/modules/tendering/tenders/components/TenderView";
import { PhysicalDocsSection } from "@/modules/tendering/physical-docs/components/PhysicalDocsView";
import { RfqSection } from "@/modules/tendering/rfqs/components/RfqView";
import { EmdTenderFeeSection } from "@/modules/tendering/emds-tenderfees/components/EmdTenderFeeShow";
import { DocumentChecklistSection } from "@/modules/tendering/checklists/components/DocumentChecklistView";
import { CostingSheetSection } from "@/modules/tendering/costing-sheets/components/CostingSheetView";
import { BidSubmissionSection } from "@/modules/tendering/bid-submissions/components/BidSubmissionView";
import { RaSection } from "@/modules/tendering/ras/components/RaShow";
import { TqTenderSection } from "@/modules/tendering/tq-management/components/TqView";
import { TenderResultSection } from "@/modules/tendering/results/components/TenderResultView";
import { TenderStepsPageLayout } from "@/modules/tendering/components/TenderStepsPageLayout";
import { BasicDetailsSection } from "@/modules/operations/wo-basic-details/components/BasicDetailsSection";

interface TenderViewPageProps {
    tenderId: number;
    onBack?: () => void;
    backLabel?: string;
}

export function TenderViewPage({ tenderId, onBack, backLabel }: TenderViewPageProps) {
    const { steps, basicDetails } = useTenderStepStatuses(tenderId);

    const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(["tender-details"]));

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
            case "physical-docs":  return <PhysicalDocsSection tenderId={tenderId} />;
            case "rfq":            return <RfqSection tenderId={tenderId} />;
            case "emd-fees":       return <EmdTenderFeeSection tenderId={tenderId} />;
            case "checklist":      return <DocumentChecklistSection tenderId={tenderId} />;
            case "costing":        return <CostingSheetSection tenderId={tenderId} />;
            case "bid":            return <BidSubmissionSection tenderId={tenderId} />;
            case "tq-management":  return <TqTenderSection tenderId={tenderId} />;
            case "ra-management":  return <RaSection tenderId={tenderId!} />;
            case "result":         return <TenderResultSection tenderId={tenderId} />;
            case "basic-details":
                if (!basicDetails?.length) return null;
                return (
                    <div className="space-y-6">
                        {basicDetails.map((wo, idx) => (
                            <div key={wo.id} className="space-y-3">
                                {basicDetails.length > 1 && (
                                    <h4 className="text-sm font-semibold text-muted-foreground">
                                        Order {idx + 1}
                                        {wo.orderType === "multiple" && wo.orderSequence ? ` · #${wo.orderSequence}` : ""}
                                    </h4>
                                )}
                                <BasicDetailsSection woBasicDetailId={wo.id} />
                            </div>
                        ))}
                    </div>
                );
            default:               return null;
        }
    }, [tenderId, basicDetails]);

    return (
        <TenderStepsPageLayout tenderId={tenderId}
            steps={steps}
            expandedSections={expandedSections}
            onToggleSection={toggleSection}
            onExpandAll={expandAll}
            onCollapseAll={collapseAll}
            onBack={onBack}
            backLabel={backLabel}
            renderSectionContent={renderSectionContent}
        />
    );
}
