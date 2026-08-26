import { useState, useCallback, useMemo } from "react";
import { ShowPageLayout, type StepConfig } from "@/components/layout/ShowPageLayout";
import { useLeadStepStatuses } from "@/hooks/api/useLeadStepStatuses";
import { useEnquiryResult, useEnquiryResultsByLead, useEnquiryResultsByHappyCalling } from "@/hooks/api/useEnquiryResult";
import { useLeadEnquiry } from "@/hooks/api/useLeadEnquiry";
import { LeadDetailsSection } from "../leads/components/LeadView";
import { FollowupViewPage } from "../followups/FollowupViewPage";
import { LeadEnquiriesSection } from "../lead-enquiry/LeadEnquiryShowPage";
import { LeadSiteVisitsSection } from "../lead-enquiry/components/LeadSiteVisitView";
import { EnquiryResultView } from "./components/EnquiryResultView";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Send } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

function getStatusVariant(status?: string | null): "default" | "secondary" | "outline" | "destructive" {
    switch (status) {
        case "Quotation Submitted": return "default";
        case "Followup Initiated": return "secondary";
        case "Won": return "default";
        case "Lost": return "destructive";
        default: return "outline";
    }
}

function EnquiryResultDetailSection({ resultId }: { resultId: number | null }) {
    const { data: result, isLoading } = useEnquiryResult(resultId);

    if (isLoading && !result) {
        return <div className="flex items-center justify-center py-8 text-muted-foreground">Loading enquiry result...</div>;
    }

    return (
        <div className="space-y-6">
            {result ? (
                <EnquiryResultView result={result} />
            ) : (
                <p className="text-sm text-muted-foreground py-4 text-center">Enquiry result not available.</p>
            )}
        </div>
    );
}

export function EnquiryResultSection({
    leadId
}: {
    leadId?: number | null;
}) {
    // Default: show all results for the lead with Initiate Followup buttons
    const { data: results, isLoading } = useEnquiryResultsByLead(leadId ?? null);
    const navigate = useNavigate();

    if (isLoading) {
        return (
            <Card className="mb-6">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        Enquiry Results
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center justify-center py-8 text-muted-foreground">Loading results...</div>
                </CardContent>
            </Card>
        );
    }

    if (!results || results.length === 0) {
        return (
            <Card className="mb-6">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        Enquiry Results
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-sm text-muted-foreground py-4 text-center">No enquiry results found for this lead.</p>
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="space-y-4">
            {results.map((result) => (
                <Card key={result.id} className="mb-6">
                    <CardHeader>
                        <div className="flex items-start justify-between">
                            <div>
                                <CardTitle className="flex items-center gap-2">
                                    Enquiry Result
                                    <Badge variant={getStatusVariant(result.status)}>
                                        {result.status || "—"}
                                    </Badge>
                                </CardTitle>
                            </div>
                            <div className="flex gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => navigate(`/crm/enquiry-results/followup/${result.id}`)}
                                >
                                    <Send className="h-3 w-3 mr-1" /> Initiate Followup
                                </Button>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <EnquiryResultView result={result} />
                    </CardContent>
                </Card>
            ))}
        </div>
    );
}

export function HappyCallingEnquiryResultSection({
    happyCallingId
}: {
    happyCallingId?: number | null;
}) {
    // Show all results for the enquiries linked to this happy calling
    const { data: results, isLoading } = useEnquiryResultsByHappyCalling(happyCallingId ?? null);
    const navigate = useNavigate();

    if (isLoading) {
        return (
            <Card className="mb-6">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        Enquiry Results
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center justify-center py-8 text-muted-foreground">Loading results...</div>
                </CardContent>
            </Card>
        );
    }

    if (!results || results.length === 0) {
        return (
            <Card className="mb-6">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        Enquiry Results
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-sm text-muted-foreground py-4 text-center">No enquiry results found for this happy calling.</p>
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="space-y-4">
            {results.map((result) => (
                <Card key={result.id} className="mb-6">
                    <CardHeader>
                        <div className="flex items-start justify-between">
                            <div>
                                <CardTitle className="flex items-center gap-2">
                                    Enquiry Result
                                    <Badge variant={getStatusVariant(result.status)}>
                                        {result.status || "—"}
                                    </Badge>
                                </CardTitle>
                            </div>
                            <div className="flex gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => navigate(`/crm/enquiry-results/followup/${result.id}`)}
                                >
                                    <Send className="h-3 w-3 mr-1" /> Initiate Followup
                                </Button>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <EnquiryResultView result={result} />
                    </CardContent>
                </Card>
            ))}
        </div>
    );
}

interface EnquiryResultViewPageProps {
    resultId: number;
    onBack?: () => void;
    backLabel?: string;
}

export function EnquiryResultViewPage({ resultId, onBack, backLabel }: EnquiryResultViewPageProps) {
    const { data: result } = useEnquiryResult(resultId);
    const enquiryId = result?.enquiryId ?? null;
    const { data: enquiry } = useLeadEnquiry(enquiryId);
    const leadId = enquiry?.leadId ?? null;
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

    const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(["enquiry-result"]));

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

    const renderSectionContent = useCallback((stepId: string) => {
        if (!leadId) {
            return <div className="flex items-center justify-center py-8 text-muted-foreground">Loading...</div>;
        }
        switch (stepId) {
            case "lead-details":
                return <LeadDetailsSection leadId={leadId} />;
            case "followups":
                return <FollowupViewPage source={{ sourceType: 'lead', sourceId: leadId }} />;
            case "enquiries":
                return <LeadEnquiriesSection leadId={leadId} />;
            case "site-visits":
                return <LeadSiteVisitsSection leadId={leadId} />;
            case "enquiry-result":
                return <EnquiryResultDetailSection resultId={resultId} />;
            default:
                return null;
        }
    }, [leadId, resultId]);

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