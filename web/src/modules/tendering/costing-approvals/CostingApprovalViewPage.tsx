import { useParams, useNavigate } from 'react-router-dom';
import { useState, useCallback } from 'react';
import { paths } from '@/app/routes/paths';
import { TenderDetailsSection } from '@/modules/tendering/tenders/components/TenderView';
import { PhysicalDocsSection } from '@/modules/tendering/physical-docs/components/PhysicalDocsView';
import { RfqSection } from '@/modules/tendering/rfqs/components/RfqView';
import { EmdTenderFeeSection } from '@/modules/tendering/emds-tenderfees/components/EmdTenderFeeShow';
import { DocumentChecklistSection } from '@/modules/tendering/checklists/components/DocumentChecklistView';
import { BidSubmissionSection } from '@/modules/tendering/bid-submissions/components/BidSubmissionView';
import { ShowPageLayout } from "@/components/layout/ShowPageLayout";
import { useTenderStepStatuses } from "@/hooks/api/useTenderStepStatuses";
import { CostingSheetSection } from '../costing-sheets/components/CostingSheetView';
import { RaSection } from '../ras/components/RaShow';
import { TqTenderSection } from '../tq-management/components/TqView';
import { TenderResultSection } from '../results/components/TenderResultView';

export default function CostingApprovalViewPage() {
    const { tenderId: tenderIdParam } = useParams<{ tenderId: string }>();
    const navigate = useNavigate();
    const tenderId = tenderIdParam ? parseInt(tenderIdParam, 10) : null;

    const { steps: tenderSteps } = useTenderStepStatuses(tenderId);

    const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(["costing-details"]));

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
        if (!tenderId) return null;
        switch (stepId) {
            case "tender-details":   return <TenderDetailsSection tenderId={tenderId} />;
            case "physical-docs":    return <PhysicalDocsSection tenderId={tenderId} />;
            case "rfq":              return <RfqSection tenderId={tenderId} />;
            case "emd-fees":         return <EmdTenderFeeSection tenderId={tenderId} />;
            case "checklist":        return <DocumentChecklistSection tenderId={tenderId} />;
            case "costing":          return <CostingSheetSection tenderId={tenderId} />;
            case "bid":              return <BidSubmissionSection tenderId={tenderId} />;
            case "tq-management":  return <TqTenderSection tenderId={tenderId} />;
            case "ra-management":  return <RaSection tenderId={tenderId!} />;
            case "result":         return <TenderResultSection tenderId={tenderId} />;
            default: return null;
        }
    };

    return (
        <ShowPageLayout
            steps={tenderSteps.filter(s => ["tender-details", "physical-docs", "rfq", "emd-fees", "checklist", "costing", "bid", "tq-management", "ra-management", "result"].includes(s.id))}
            expandedSections={expandedSections}
            onToggleSection={toggleSection}
            onExpandAll={expandAll}
            onCollapseAll={collapseAll}
            onBack={() => navigate(paths.tendering.costingApprovals)}
            backLabel="Back to Costing Approvals"
            renderSectionContent={renderSectionContent}
        />
    );
}
