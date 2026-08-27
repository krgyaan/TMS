import { useState, useCallback } from "react";
import { ShowPageLayout } from "@/components/layout/ShowPageLayout";
import { useEnquiryTenderSteps, type EnquiryTenderSourceType } from "@/hooks/api/useEnquiryTenderSteps";
import { LeadDetailsSection } from "@/modules/crm/leads/components/LeadView";
import { HappyCallingView } from "@/modules/crm/happy-calling/components/HappyCallingView";
import { useHappyCalling } from "@/hooks/api/useHappyCalling";
import { LeadFollowupViewPage } from "@/modules/crm/leadfollowup/LeadFollowupViewPage";
import { EnquiryDetailsSection } from "@/modules/crm/lead-enquiry/LeadEnquiryShowPage";
import { LeadSiteVisitView } from "@/modules/crm/lead-enquiry/components/LeadSiteVisitView";
import { TenderDetailsSection } from "@/modules/tendering/tenders/components/TenderView";
import { PhysicalDocsSection } from "@/modules/tendering/physical-docs/components/PhysicalDocsView";
import { RfqSection } from "@/modules/tendering/rfqs/components/RfqView";
import { DocumentChecklistSection } from "@/modules/tendering/checklists/components/DocumentChecklistView";
import { CostingSheetSection } from "@/modules/tendering/costing-sheets/components/CostingSheetView";
import { BidSubmissionSection } from "@/modules/tendering/bid-submissions/components/BidSubmissionView";
import { TqTenderSection } from "@/modules/tendering/tq-management/components/TqView";
import { RaSection } from "@/modules/tendering/ras/components/RaShow";
import { TenderResultSection } from "@/modules/tendering/results/components/TenderResultView";
import { BasicDetailsSection } from "@/modules/operations/wo-basic-details/components/BasicDetailsSection";
import { useSiteVisits } from "@/hooks/api/useLeadEnquiry";
import { useWoBasicDetailsByTender } from "@/hooks/api/useWoBasicDetails";

interface EnquiryTenderFlowProps {
    tenderId: number | null;
    enquiryId: number | null;
    sourceType?: EnquiryTenderSourceType;
    defaultExpanded?: string;
    onBack?: () => void;
    backLabel?: string;
}

function EnquirySiteVisitsSection({ enquiryId }: { enquiryId: number | null }) {
    const { data: siteVisits, isLoading } = useSiteVisits(enquiryId);

    if (isLoading) {
        return <div className="flex items-center justify-center py-8 text-muted-foreground">Loading site visits...</div>;
    }

    if (!siteVisits?.length) {
        return <p className="text-sm text-muted-foreground py-4 text-center">No site visits found for this enquiry.</p>;
    }

    return (
        <div className="space-y-4">
            {siteVisits.map((sv) => (
                <LeadSiteVisitView key={sv.id} siteVisit={sv} />
            ))}
        </div>
    );
}

export function EnquiryTenderFlow({
    tenderId,
    enquiryId,
    sourceType = 'lead',
    defaultExpanded = "tender-details",
    onBack,
    backLabel,
}: EnquiryTenderFlowProps) {
    const { steps, leadId, happyCallingId } = useEnquiryTenderSteps({ tenderId, enquiryId, sourceType });
    const { data: happyCalling } = useHappyCalling(happyCallingId);
    const { data: basicDetailsResponse } = useWoBasicDetailsByTender(tenderId ?? 0);
    const basicDetailsId = basicDetailsResponse?.[0]?.id;

    const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set([defaultExpanded]));

    const toggleSection = useCallback((id: string) => {
        setExpandedSections((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    }, []);

    const expandAll = useCallback(() => setExpandedSections(new Set(steps.map((s) => s.id))), [steps]);
    const collapseAll = useCallback(() => setExpandedSections(new Set()), []);

    const renderSectionContent = useCallback(
        (stepId: string) => {
            switch (stepId) {
                case "lead-details":
                    return leadId ? <LeadDetailsSection leadId={leadId} /> : null;
                case "happy-calling-details":
                    return happyCalling ? <HappyCallingView record={happyCalling} /> : null;
                case "followups":
                    if (sourceType === 'happy_calling') {
                        return happyCallingId ? <LeadFollowupViewPage source={{ sourceType: "happy_calling", sourceId: happyCallingId }} /> : null;
                    }
                    return leadId ? <LeadFollowupViewPage source={{ sourceType: "lead", sourceId: leadId }} /> : null;
                case "enquiry":
                    return <EnquiryDetailsSection enquiryId={enquiryId} />;
                case "site-visit":
                    return <EnquirySiteVisitsSection enquiryId={enquiryId} />;
                case "tender-details":
                    return <TenderDetailsSection tenderId={tenderId} />;
                case "physical-docs":
                    return <PhysicalDocsSection tenderId={tenderId} />;
                case "rfq":
                    return <RfqSection tenderId={tenderId} />;
                case "checklist":
                    return <DocumentChecklistSection tenderId={tenderId} />;
                case "costing":
                    return <CostingSheetSection tenderId={tenderId} />;
                case "bid":
                    return <BidSubmissionSection tenderId={tenderId} />;
                case "quotation-followup":
                    return <LeadFollowupViewPage source={{ sourceType: "enquiry", sourceId: enquiryId! }} />;
                case "tq-management":
                    return <TqTenderSection tenderId={tenderId} />;
                case "ra-management":
                    return <RaSection tenderId={tenderId!} />;
                case "result":
                    return <TenderResultSection tenderId={tenderId} />;
                case "basic-details":
                    return basicDetailsId ? <BasicDetailsSection woBasicDetailId={basicDetailsId} /> : null;
                default:
                    return null;
            }
        },
        [tenderId, enquiryId, leadId, happyCallingId, happyCalling, sourceType, basicDetailsId]
    );

    return (
        <ShowPageLayout
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
