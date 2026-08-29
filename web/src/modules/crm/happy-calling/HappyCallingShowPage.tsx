import { useParams, useNavigate } from "react-router-dom";
import { useState, useCallback, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { HappyCallingView } from "./components/HappyCallingView";
import { LeadFollowupViewPage } from "../leadfollowup/LeadFollowupViewPage";
import { ShowPageLayout, type StepConfig } from "@/components/layout/ShowPageLayout";
import { useHappyCalling } from "@/hooks/api/useHappyCalling";
import { useLeadFollowups } from "@/hooks/api/useLeadFollowups";
import { useLeadEnquiries } from "@/hooks/api/useLeadEnquiry";
import { EnquiryTenderFlow } from "@/modules/tendering/tenders/components/EnquiryTenderFlow";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { paths } from "@/app/routes/paths";

export default function HappyCallingShowPage() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const happyCallingId = id ? Number(id) : null;

    const { data: record, isLoading } = useHappyCalling(happyCallingId);
    const { data: followups, isLoading: l2 } = useLeadFollowups({ sourceType: 'happy_calling', sourceId: happyCallingId ?? 0 });
    const { data: enquiriesResponse } = useLeadEnquiries(
        { page: 1, limit: 1, happyCallingId: happyCallingId ?? undefined },
    );
    const [searchParams] = useSearchParams();
    const initialSection = searchParams.get("section");

    const linkedEnquiry = enquiriesResponse?.data?.find((e) => e.tenderId) ?? null;
    const hasEnquiry = (enquiriesResponse?.meta?.total ?? 0) > 0;

    const simpleSteps = useMemo<StepConfig[]>(() => {
        const list: StepConfig[] = [
            {
                id: "happy-calling-details",
                label: "Happy Calling",
                shortLabel: "HC",
                stepNumber: 1,
                hasData: !!record,
                isLoading,
                status: isLoading ? "loading" : record ? "completed" : "pending",
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
    }, [record, isLoading, followups, l2]);

    const [expandedSections, setExpandedSections] = useState<Set<string>>(
        () => new Set(initialSection === "followups" ? ["followups"] : ["happy-calling-details"])
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
                case "happy-calling-details":
                    if (isLoading && !record) {
                        return <Skeleton className="h-40 w-full" />;
                    }
                    if (!record) {
                        return (
                            <Alert variant="destructive">
                                <AlertCircle className="h-4 w-4" />
                                <AlertDescription>
                                    Happy calling entry not found.
                                </AlertDescription>
                            </Alert>
                        );
                    }
                    return <HappyCallingView record={record} />;
                case "followups":
                    return happyCallingId ? <LeadFollowupViewPage source={{ sourceType: 'happy_calling', sourceId: happyCallingId }} /> : null;
                default:
                    return null;
            }
        },
        [happyCallingId, record, isLoading]
    );

    if (!happyCallingId || isNaN(happyCallingId)) {
        return <div className="p-8 text-center text-muted-foreground">Invalid Happy Calling ID.</div>;
    }

    if (hasEnquiry && linkedEnquiry) {
        return (
            <EnquiryTenderFlow
                tenderId={linkedEnquiry.tenderId}
                enquiryId={linkedEnquiry.id}
                sourceType="happy_calling"
                defaultExpanded="happy-calling-details"
                onBack={() => navigate(paths.crm.happyCalling)}
                backLabel="Back to Happy Calling"
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
            onBack={() => navigate(paths.crm.happyCalling)}
            backLabel="Back to Happy Calling"
            renderSectionContent={renderSimpleContent}
        />
    );
}
