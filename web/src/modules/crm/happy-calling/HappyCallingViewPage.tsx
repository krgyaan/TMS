import { useState, useCallback, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { HappyCallingView } from "./components/HappyCallingView";
import { FollowupViewPage } from "../followups/FollowupViewPage";
import { ShowPageLayout, type StepConfig } from "@/components/layout/ShowPageLayout";
import { useSourceStepStatuses } from "@/hooks/api/useLeadStepStatuses";
import { useHappyCalling } from "@/hooks/api/useHappyCalling";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

interface HappyCallingViewPageProps {
    happyCallingId: number;
    onBack?: () => void;
    backLabel?: string;
}

export function HappyCallingViewPage({ happyCallingId, onBack, backLabel }: HappyCallingViewPageProps) {
    const stepStatuses = useSourceStepStatuses({ sourceType: 'happy_calling', sourceId: happyCallingId });
    const { data: record, isLoading } = useHappyCalling(happyCallingId);
    const [searchParams] = useSearchParams();
    const initialSection = searchParams.get("section");

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
        () => setExpandedSections(new Set(steps.map((s) => s.id))),
        [steps]
    );

    const collapseAll = useCallback(() => setExpandedSections(new Set()), []);

    const renderSectionContent = useCallback(
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
                    return <FollowupViewPage source={{ sourceType: 'happy_calling', sourceId: happyCallingId }} />;
                case "enquiries":
                    return <p className="text-sm text-muted-foreground py-4 text-center">No enquiries found for this happy calling.</p>;
                case "site-visits":
                    return <p className="text-sm text-muted-foreground py-4 text-center">No site visits found for this happy calling.</p>;
                case "costings":
                    return <p className="text-sm text-muted-foreground py-4 text-center">No costings found for this happy calling.</p>;
                case "quotations":
                    return <p className="text-sm text-muted-foreground py-4 text-center">No quotations found for this happy calling.</p>;
                case "enquiry-result":
                    return <p className="text-sm text-muted-foreground py-4 text-center">No enquiry results found for this happy calling.</p>;
                default:
                    return null;
            }
        },
        [happyCallingId, record, isLoading]
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