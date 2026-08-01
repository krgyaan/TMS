import { useState, useCallback, useMemo } from "react";
import { ShowPageLayout, type StepConfig } from "@/components/layout/ShowPageLayout";
import { useLeadStepStatuses } from "@/hooks/api/useLeadStepStatuses";
import { useEnquiryResult, useEnquiryResultsByLead, useFollowupsByQuotation } from "@/hooks/api/useEnquiryResult";
import { useLeadEnquiry } from "@/hooks/api/useLeadEnquiry";
import { LeadDetailsSection } from "../leads/components/LeadView";
import { FollowupViewPage } from "../followups/FollowupViewPage";
import { LeadEnquiriesSection } from "../lead-enquiry/LeadEnquiryViewPage";
import { LeadSiteVisitsSection } from "../lead-enquiry/components/LeadSiteVisitView";
import { LeadCostingsSection } from "../enquirycosting/EnquiryCostingViewPage";
import { LeadQuotationsSection } from "../leads-quotation/LeadsQuotationViewPage";
import { EnquiryResultView } from "./components/EnquiryResultView";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Send, User, Calendar, Clock, Mail, Phone } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { format } from "date-fns";

function getStatusVariant(status?: string | null): "default" | "secondary" | "outline" | "destructive" {
    switch (status) {
        case "Quotation Submitted": return "default";
        case "Followup Initiated": return "secondary";
        case "Won": return "default";
        case "Lost": return "destructive";
        default: return "outline";
    }
}

function getFrequencyLabel(frequency: number | null | undefined): string {
    if (!frequency) return "—";
    const labels: Record<number, string> = {
        1: "Daily",
        2: "Alternate Days",
        3: "Weekly",
        4: "Fortnightly",
        5: "Monthly",
        6: "Quarterly",
        7: "Half Yearly",
        8: "Yearly",
    };
    return labels[frequency] || String(frequency);
}

function formatDate(dateStr?: string | null): string {
    if (!dateStr) return "—";
    try {
        return format(new Date(dateStr), "PP");
    } catch {
        return dateStr;
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

function FollowupCard({ followup }: { followup: any }) {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <Collapsible open={isOpen} onOpenChange={setIsOpen} className="border rounded-lg bg-card">
            <CollapsibleTrigger className="w-full p-4 hover:bg-muted/50 transition-colors">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="text-left">
                            <p className="font-medium">
                                {formatDate(followup.createdAt)}
                            </p>
                            <p className="text-sm text-muted-foreground">
                                by {followup.createdByName || "Unknown"}
                            </p>
                        </div>
                    </div>
                    {isOpen ? (
                        <Mail className="h-5 w-5 text-muted-foreground rotate-180" />
                    ) : (
                        <Mail className="h-5 w-5 text-muted-foreground" />
                    )}
                </div>
            </CollapsibleTrigger>

            <CollapsibleContent className="p-4 pt-0 space-y-4">
                {followup.details && (
                    <div>
                        <p className="text-sm font-medium text-muted-foreground mb-1">
                            Points Discussed
                        </p>
                        <p className="text-sm whitespace-pre-wrap">
                            {followup.details}
                        </p>
                    </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                        <p className="text-sm font-medium text-muted-foreground mb-1">
                            Frequency
                        </p>
                        <p className="text-sm flex items-center gap-1">
                            <Clock className="h-3 w-3 text-muted-foreground" />
                            {getFrequencyLabel(followup.frequency)}
                        </p>
                    </div>
                    <div>
                        <p className="text-sm font-medium text-muted-foreground mb-1">
                            Next Follow-up Date
                        </p>
                        <p className="text-sm flex items-center gap-1">
                            <Calendar className="h-3 w-3 text-muted-foreground" />
                            {formatDate(followup.nextFollowUpDate)}
                        </p>
                    </div>
                </div>

                {followup.contacts && followup.contacts.length > 0 && (
                    <div>
                        <p className="text-sm font-medium text-muted-foreground mb-2">
                            Contacts
                        </p>
                        <div className="space-y-2">
                            {followup.contacts.map((contact: any, idx: number) => (
                                <div
                                    key={idx}
                                    className="border rounded-lg p-3 bg-muted/30"
                                >
                                    <div className="flex items-start gap-2">
                                        <User className="h-4 w-4 mt-0.5 text-muted-foreground flex-shrink-0" />
                                        <div className="space-y-0.5">
                                            <p className="font-medium text-sm">
                                                {contact.name}
                                            </p>
                                            {contact.designation && (
                                                <p className="text-xs text-muted-foreground">
                                                    {contact.designation}
                                                </p>
                                            )}
                                            {contact.phone && (
                                                <p className="text-xs flex items-center gap-1">
                                                    <Phone className="h-3 w-3" />
                                                    {contact.phone}
                                                </p>
                                            )}
                                            {contact.email && (
                                                <p className="text-xs flex items-center gap-1 text-blue-500">
                                                    <Mail className="h-3 w-3" />
                                                    {contact.email}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {followup.startFrom && (
                    <div>
                        <p className="text-sm font-medium text-muted-foreground mb-1">
                            Start Date
                        </p>
                        <p className="text-sm flex items-center gap-1">
                            <Calendar className="h-3 w-3 text-muted-foreground" />
                            {formatDate(followup.startFrom)}
                        </p>
                    </div>
                )}
            </CollapsibleContent>
        </Collapsible>
    );
}

export function EnquiryResultSection({ 
    leadId, 
    quotationId 
}: { 
    leadId?: number | null; 
    quotationId?: number | null; 
}) {
    // If quotationId provided, show followups for that quotation
    if (quotationId) {
        const { data: followups, isLoading } = useFollowupsByQuotation(quotationId);

        if (isLoading) {
            return (
                <Card className="mb-6">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            Follow-ups for this Quotation
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center justify-center py-8 text-muted-foreground">Loading follow-ups...</div>
                    </CardContent>
                </Card>
            );
        }

        if (!followups || followups.length === 0) {
            return (
                <Card className="mb-6">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            Follow-ups for this Quotation
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-muted-foreground py-4 text-center">No follow-ups found for this quotation.</p>
                    </CardContent>
                </Card>
            );
        }

        return (
            <div className="space-y-4">
                {followups.map((followup) => (
                    <FollowupCard key={followup.id} followup={followup} />
                ))}
            </div>
        );
    }

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
                return <FollowupViewPage leadId={leadId} />;
            case "enquiries":
                return <LeadEnquiriesSection leadId={leadId} />;
            case "site-visits":
                return <LeadSiteVisitsSection leadId={leadId} />;
            case "costings":
                return <LeadCostingsSection leadId={leadId} />;
            case "quotations":
                return <LeadQuotationsSection leadId={leadId} />;
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