import { useParams, useNavigate } from 'react-router-dom';
import { useState, useCallback } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import { paths } from '@/app/routes/paths';
import { TenderDetailsSection } from '@/modules/tendering/tenders/components/TenderView';
import { PhysicalDocsSection } from '@/modules/tendering/physical-docs/components/PhysicalDocsView';
import { EmdTenderFeeSection } from '@/modules/tendering/emds-tenderfees/components/EmdTenderFeeShow';
import { DocumentChecklistSection } from '@/modules/tendering/checklists/components/DocumentChecklistView';
import { CostingSheetSection } from '@/modules/tendering/costing-sheets/components/CostingSheetView';
import { BidSubmissionSection } from '@/modules/tendering/bid-submissions/components/BidSubmissionView';
import { TqSection } from './components/TqView';
import { ShowPageLayout } from "@/components/layout/ShowPageLayout";
import { useTenderStepStatuses } from "@/hooks/api/useTenderStepStatuses";

export default function TqViewPage() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const tqId = id ? parseInt(id, 10) : null;

    const { steps, tqData } = useTenderStepStatuses(null, { tqId: tqId ?? undefined });
    
    // Correction: TqViewPage actually has a TQ ID. I need to get the tenderId FROM the TQ data first.
    // This is a special case where we don't have tenderId in the URL.
    // I'll keep the TQ fetching here for now to get the tenderId.
    
    const tenderId = tqData?.tenderId || null;
    const { steps: tenderSteps } = useTenderStepStatuses(tenderId);

    const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(["tq-management"]));

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
            case "emd-fees":         return <EmdTenderFeeSection tenderId={tenderId} />;
            case "checklist":        return <DocumentChecklistSection tenderId={tenderId} />;
            case "costing":          return <CostingSheetSection tenderId={tenderId} />;
            case "bid":              return <BidSubmissionSection tenderId={tenderId} />;
            case "tq-management":    return tqId ? <TqSection tqId={tqId} /> : null;
            default: return null;
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

    return (
        <ShowPageLayout
            steps={tenderSteps.filter(s => ["tender-details", "physical-docs", "emd-fees", "checklist", "costing", "bid", "tq-management"].includes(s.id))}
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
