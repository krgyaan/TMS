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
import { TqTenderSection } from './components/TqView';
import { ShowPageLayout } from "@/components/layout/ShowPageLayout";
import { useTenderStepStatuses } from "@/hooks/api/useTenderStepStatuses";
import { RfqSection } from '../rfqs/components/RfqView';
import { RaSection } from '../ras/components/RaShow';
import { TenderResultSection } from '../results/components/TenderResultShow';

export default function TqViewPage() {
    const { tenderId } = useParams();

    if (!tenderId) {
        return (
            <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>Invalid TQ ID {tenderId}</AlertDescription>
            </Alert>
        );
    }

    const navigate = useNavigate();
    const parsedTenderId = tenderId ? parseInt(tenderId, 10) : null;

    const { steps: tenderSteps } = useTenderStepStatuses(parsedTenderId);

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
        if (!parsedTenderId) return null;
        switch (stepId) {
            case "tender-details": return <TenderDetailsSection tenderId={parsedTenderId} />;
            case "physical-docs": return <PhysicalDocsSection tenderId={parsedTenderId} />;
            case "emd-fees": return <EmdTenderFeeSection tenderId={parsedTenderId} />;
            case "rfq": return <RfqSection tenderId={parsedTenderId} />;
            case "checklist": return <DocumentChecklistSection tenderId={parsedTenderId} />;
            case "costing": return <CostingSheetSection tenderId={parsedTenderId} />;
            case "bid": return <BidSubmissionSection tenderId={parsedTenderId} />;
            case "tq-management": return <TqTenderSection tenderId={parsedTenderId} />;
            case "ra-management": return <RaSection tenderId={parsedTenderId} />;
            case "result": return <TenderResultSection tenderId={parsedTenderId} />;
            default: return null;
        }
    };

    return (
        <ShowPageLayout
            steps={tenderSteps.filter(s => ["tender-details", "physical-docs", "emd-fees", "rfq", "checklist", "costing", "bid", "tq-management", "ra-management", "result"].includes(s.id))}
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
