import { useParams, useNavigate } from "react-router-dom";
import { useState, useCallback, useMemo } from "react";
import { LeadDetailsSection } from "./components/LeadView";
import { LeadFollowupViewPage } from "../leadfollowup/LeadFollowupViewPage";
import { ShowPageLayout, type StepConfig } from "@/components/layout/ShowPageLayout";
import { useLead } from "@/hooks/api/useLeads";
import { useLeadFollowups } from "@/hooks/api/useLeadFollowups";
import { useLeadEnquiries } from "@/hooks/api/useLeadEnquiry";
import { EnquiryTenderFlow } from "@/modules/tendering/tenders/components/EnquiryTenderFlow";
import { paths } from "@/app/routes/paths";

export default function LeadShowPage() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const leadId = id ? Number(id) : null;

    const { data: lead, isLoading: l1 } = useLead(leadId);
    const { data: followups, isLoading: l2 } = useLeadFollowups({ sourceType: 'lead', sourceId: leadId ?? 0 });
    const { data: enquiriesResponse } = useLeadEnquiries(
        { page: 1, limit: 1, leadId: leadId ?? undefined },
    );

    const linkedEnquiry = enquiriesResponse?.data?.find((e) => e.tenderId) ?? null;

    const hasEnquiry = (enquiriesResponse?.meta?.total ?? 0) > 0;

    const simpleSteps = useMemo<StepConfig[]>(() => {
        const list: StepConfig[] = [
            {
                id: "lead-details",
                label: "Lead Details",
                shortLabel: "Details",
                stepNumber: 1,
                hasData: !!lead,
                isLoading: l1,
                status: l1 ? "loading" : lead ? "completed" : "pending",
            },
            {
                id: "followups",
                label: "Follow-ups",
                shortLabel: "FU",
                stepNumber: 2,
                hasData: Array.isArray(followups) && followups.length > 0,
                isLoading: l2,
                status: l2 ? "loading" : (Array.isArray(followups) && followups.length > 0) ? "completed" : "pending",
            },
        ];
        return list;
    }, [lead, l1, followups, l2]);

    const [expandedSections, setExpandedSections] = useState<Set<string>>(
        () => new Set(["lead-details"])
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
        () => setExpandedSections(new Set(simpleSteps.map((s) => s.id))),
        [simpleSteps]
    );

    const collapseAll = useCallback(() => setExpandedSections(new Set()), []);

    const renderSimpleContent = useCallback(
        (stepId: string) => {
            switch (stepId) {
                case "lead-details":
                    return leadId ? <LeadDetailsSection leadId={leadId} /> : null;
                case "followups":
                    return leadId ? <LeadFollowupViewPage source={{ sourceType: 'lead', sourceId: leadId }} /> : null;
                default:
                    return null;
            }
        },
        [leadId]
    );

    if (!leadId) {
        return <div className="p-8 text-center text-muted-foreground">Invalid lead ID.</div>;
    }

    if (hasEnquiry && linkedEnquiry) {
        return (
            <EnquiryTenderFlow
                tenderId={linkedEnquiry.tenderId}
                enquiryId={linkedEnquiry.id}
                sourceType="lead"
                defaultExpanded="lead-details"
                onBack={() => navigate(paths.crm.leads)}
                backLabel="Back to Leads"
            />
        );
    }

    return (
        <ShowPageLayout
            steps={simpleSteps}
            expandedSections={expandedSections}
            onToggleSection={toggleSection}
            onExpandAll={expandAll}
            onCollapseAll={collapseAll}
            onBack={() => navigate(paths.crm.leads)}
            backLabel="Back to Leads"
            renderSectionContent={renderSimpleContent}
        />
    );
}
