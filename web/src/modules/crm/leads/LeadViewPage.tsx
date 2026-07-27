import { useState, useCallback, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { LeadDetailsSection } from "./components/LeadView";
import { FollowupViewPage } from "../followups/FollowupViewPage";
import { ShowPageLayout, type StepConfig } from "@/components/layout/ShowPageLayout";
import { useLeadStepStatuses } from "@/hooks/api/useLeadStepStatuses";
import { useLeadEnquiries } from "@/hooks/api/useLeadEnquiry";
import { LeadEnquiryView } from "../lead-enquiry/LeadEnquiryViewPage";
import { LeadSiteVisitView } from "../lead-enquiry/components/LeadSiteVisitView";
import { EnquiryCostingView } from "../enquirycosting/EnquiryCostingViewPage";
import { leadEnquiryService } from "@/services/api/lead-enquiry.service";
import { enquiryCostingService } from "@/services/api/enquirycosting.service";

interface LeadViewPageProps {
    leadId: number;
    onBack?: () => void;
    backLabel?: string;
}

function LeadEnquiriesContent({ leadId }: { leadId: number }) {
    const { data: apiResponse, isLoading } = useLeadEnquiries(
        { page: 1, limit: 50, leadId },
    );

    if (isLoading) {
        return <div className="flex items-center justify-center py-8 text-muted-foreground">Loading enquiries...</div>;
    }

    if (!apiResponse?.data?.length) {
        return <p className="text-sm text-muted-foreground py-4 text-center">No enquiries found for this lead.</p>;
    }

    return (
        <div className="space-y-4">
            {apiResponse.data.map((enquiry) => (
                <LeadEnquiryView key={enquiry.id} enquiry={enquiry} />
            ))}
        </div>
    );
}

function LeadSiteVisitsContent({ leadId }: { leadId: number }) {
    const { data: siteVisits, isLoading } = useQuery({
        queryKey: ['site-visits', 'by-lead', leadId],
        queryFn: () => leadEnquiryService.getSiteVisitsByLead(leadId),
    });

    if (isLoading) {
        return <div className="flex items-center justify-center py-8 text-muted-foreground">Loading site visits...</div>;
    }

    if (!siteVisits?.length) {
        return <p className="text-sm text-muted-foreground py-4 text-center">No site visits found for this lead.</p>;
    }

    return (
        <div className="space-y-4">
            {siteVisits.map((sv) => (
                <LeadSiteVisitView key={sv.id} siteVisit={sv as any} />
            ))}
        </div>
    );
}

function LeadCostingsContent({ leadId }: { leadId: number }) {
    const { data: costings, isLoading } = useQuery({
        queryKey: ['enquiry-costings', 'by-lead', leadId],
        queryFn: () => enquiryCostingService.getByLeadId(leadId),
    });

    if (isLoading) {
        return <div className="flex items-center justify-center py-8 text-muted-foreground">Loading costings...</div>;
    }

    if (!costings?.length) {
        return <p className="text-sm text-muted-foreground py-4 text-center">No costings found for this lead.</p>;
    }

    return (
        <div className="space-y-4">
            {costings.map((c) => (
                <EnquiryCostingView key={c.id} costing={c} />
            ))}
        </div>
    );
}

export function LeadViewPage({ leadId, onBack, backLabel }: LeadViewPageProps) {
    const stepStatuses = useLeadStepStatuses(leadId);

    const steps = useMemo<StepConfig[]>(() => stepStatuses.map(s => ({
        id: s.id,
        label: s.label,
        shortLabel: s.shortLabel,
        stepNumber: s.stepNumber,
        status: s.status,
        hasData: s.hasData,
        isLoading: s.isLoading,
    })), [stepStatuses]);

    const [expandedSections, setExpandedSections] = useState<Set<string>>(
        new Set(["lead-details"])
    );

    const toggleSection = useCallback((id: string) => {
        setExpandedSections((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    }, []);

    const expandAll = useCallback(
        () => setExpandedSections(new Set(steps.map((s) => s.id))),
        [steps]
    );

    const collapseAll = useCallback(() => setExpandedSections(new Set()), []);

    const renderSectionContent = useCallback(
        (stepId: string) => {
            switch (stepId) {
                case "lead-details":
                    return <LeadDetailsSection leadId={leadId} />;
                case "followups":
                    return <FollowupViewPage leadId={leadId} />;
                case "enquiries":
                    return <LeadEnquiriesContent leadId={leadId} />;
                case "site-visits":
                    return <LeadSiteVisitsContent leadId={leadId} />;
                case "costings":
                    return <LeadCostingsContent leadId={leadId} />;
                default:
                    return null;
            }
        },
        [leadId]
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
