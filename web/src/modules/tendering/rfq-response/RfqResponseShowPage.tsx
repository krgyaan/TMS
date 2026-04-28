import { useParams, useNavigate } from 'react-router-dom';
import { useState, useCallback } from 'react';
import { paths } from '@/app/routes/paths';
import { TenderDetailsSection } from '@/modules/tendering/tenders/components/TenderView';
import { PhysicalDocsSection } from '@/modules/tendering/physical-docs/components/PhysicalDocsView';
import { RfqSection } from '@/modules/tendering/rfqs/components/RfqView';
import { RfqResponseSection } from './components/RfqResponseSection';
import { EmdTenderFeeSection } from '@/modules/tendering/emds-tenderfees/components/EmdTenderFeeShow';
import { DocumentChecklistSection } from '@/modules/tendering/checklists/components/DocumentChecklistView';
import { CostingSheetSection } from '@/modules/tendering/costing-sheets/components/CostingSheetView';
import { BidSubmissionSection } from '@/modules/tendering/bid-submissions/components/BidSubmissionView';
import { RaSection } from "@/modules/tendering/ras/components/RaShow";
import { TqTenderSection } from "@/modules/tendering/tq-management/components/TqView";
import { TenderResultSection } from "@/modules/tendering/results/components/TenderResultShow";
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import { ShowPageLayout } from "@/components/layout/ShowPageLayout";
import { useTenderStepStatuses } from "@/hooks/api/useTenderStepStatuses";

export default function RfqResponseShowPage() {
    const { responseId } = useParams<{ responseId: string }>();
    const navigate = useNavigate();
    const responseIdNum = responseId ? Number(responseId) : null;

    const { steps: tenderSteps, tender } = useTenderStepStatuses(null, { rfqResponseId: responseIdNum });
    const tenderId = tender?.id || null;

    const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(["rfq-response"]));

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
        switch (stepId) {
            case "tender-details": return tenderId ? <TenderDetailsSection tenderId={tenderId} /> : null;
            case "physical-docs":  return tenderId ? <PhysicalDocsSection tenderId={tenderId} /> : null;
            case "rfq":            return tenderId ? <RfqSection tenderId={tenderId} /> : null;
            case "rfq-response":   return responseIdNum ? <RfqResponseSection responseId={responseIdNum} /> : null;
            case "emd-fees":       return tenderId ? <EmdTenderFeeSection tenderId={tenderId} /> : null;
            case "checklist":      return tenderId ? <DocumentChecklistSection tenderId={tenderId} /> : null;
            case "costing":        return tenderId ? <CostingSheetSection tenderId={tenderId} /> : null;
            case "bid":            return tenderId ? <BidSubmissionSection tenderId={tenderId} /> : null;
            case "tq-management":  return tenderId ? <TqTenderSection tenderId={tenderId} /> : null;
            case "ra-management":  return tenderId ? <RaSection tenderId={tenderId} /> : null;
            case "result":         return tenderId ? <TenderResultSection tenderId={tenderId} /> : null;
            default: return null;
        }
    };

    if (!responseIdNum) {
        return (
            <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>Invalid Response ID.</AlertDescription>
            </Alert>
        );
    }

    return (
        <ShowPageLayout
            steps={tenderSteps.filter(s => ["tender-details", "physical-docs", "rfq", "rfq-response", "emd-fees", "checklist", "costing", "bid", "tq-management", "ra-management", "result"].includes(s.id))}
            expandedSections={expandedSections}
            onToggleSection={toggleSection}
            onExpandAll={expandAll}
            onCollapseAll={collapseAll}
            onBack={() => navigate(paths.tendering.rfqsResponses)}
            backLabel="Back to RFQ Responses"
            renderSectionContent={renderSectionContent}
        />
    );
}
