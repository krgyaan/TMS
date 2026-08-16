import { useState, useCallback, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { ShowPageLayout, type StepConfig } from "@/components/layout/ShowPageLayout";
import { useQuery } from "@tanstack/react-query";
import { useLeadsQuotation, useUpdateQuote } from "@/hooks/api/useLeadsQuotation";
import { useLeadStepStatuses } from "@/hooks/api/useLeadStepStatuses";
import { useLeadEnquiry } from "@/hooks/api/useLeadEnquiry";
import { leadsQuotationService } from "@/services/api/leads-quotation.service";
import { fileUploadService } from "@/services/api/file-upload.service";
import { ExternalLink } from "lucide-react";

const docUrl = (doc: string): string =>
    doc.includes("/") ? fileUploadService.getFileUrl(doc) : `/uploads/crm/leads-quotations/${doc}`;
import { cn } from "@/lib/utils";
import type { PrivateQuote, ContactEntry } from "./helpers/leads-quotation.type";
import { LeadDetailsSection } from "../leads/components/LeadView";
import { FollowupViewPage } from "../followups/FollowupViewPage";
import { LeadEnquiriesSection } from "../lead-enquiry/LeadEnquiryViewPage";
import { LeadSiteVisitsSection } from "../lead-enquiry/components/LeadSiteVisitView";
import { LeadCostingsSection } from "../enquirycosting/EnquiryCostingViewPage";
import { QuoteSubmissionModal } from "./components/QuoteSubmissionModal";
import { QuotationDroppedModal } from "./components/QuotationDroppedModal";
import { EnquiryResultSection } from "../enquiry-result/EnquiryResultViewPage";
import { User, Mail, Phone, Briefcase } from "lucide-react";
import { Table, TableBody, TableRow, TableCell } from "@/components/ui/table";


function getStatusVariant(status?: string | null): "default" | "secondary" | "outline" | "destructive" {
    switch (status) {
        case "Submission Pending": return "secondary";
        case "Quotation Submitted": return "default";
        case "Quotation Dropped": return "destructive";
        default: return "outline";
    }
}

function formatDateTime(dateStr: string) {
    const date = new Date(dateStr);
    return date.toLocaleString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
}

export function QuotationView({ quote, className }: { quote: PrivateQuote; className?: string }) {
    const isSubmitted = quote.status === 'Quotation Submitted';
    const isDropped = quote.status === 'Quotation Dropped';
    const isPending = quote.status === 'Submission Pending';

    return (
        <Card className={cn("mb-6", className)}>
            <CardHeader>
                <div className="flex items-start justify-between">
                    <div>
                        <CardTitle className="flex items-center gap-2">
                            Quotation
                            <Badge variant={getStatusVariant(quote.status)}>
                                {quote.status || "—"}
                            </Badge>
                        </CardTitle>
                        <CardDescription>
                            {quote.enquiryNumber && `Enquiry: ${quote.enquiryNumber}`}
                        </CardDescription>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Enquiry Name</Label>
                        <p className="font-medium">{quote.enqName || "—"}</p>
                    </div>
                    <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Organization</Label>
                        <p className="font-medium">{quote.organizationName || "—"}</p>
                    </div>
                    <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Approx Value (GST Incl.)</Label>
                        <p className="font-medium">{quote.approxValue ? `₹${quote.approxValue}` : "—"}</p>
                    </div>
                    <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Final Price</Label>
                        <p className="font-medium">
                            {quote.approvedFinalPrice
                                ? `₹${quote.approvedFinalPrice} (Approved)`
                                : quote.finalPrice
                                    ? `₹${quote.finalPrice}`
                                    : "—"}
                        </p>
                    </div>
                </div>

                {/* Common fields for all statuses */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t">
                    <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Created At</Label>
                        <p className="font-medium">{quote.createdAt ? formatDateTime(quote.createdAt) : "—"}</p>
                    </div>
                </div>

                {/* Pending-specific notice */}
                {isPending && (
                    <div className="pt-4 border-t">
                        <Label className="text-xs text-muted-foreground">Status Note</Label>
                        <p className="text-sm text-muted-foreground italic">
                            This quotation is pending submission.
                        </p>
                    </div>
                )}

                {/* Submitted-specific fields */}
                {isSubmitted && (
                    <>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t">
                            <div className="space-y-1">
                                <Label className="text-xs text-muted-foreground">Quote Submission Date</Label>
                                <p className="font-medium">{quote.quoteSubmissionDatetime ? formatDateTime(quote.quoteSubmissionDatetime) : "—"}</p>
                            </div>
                        </div>
                        {quote.submittedDocuments && (
                            <div className="space-y-2 pt-4 border-t">
                                <Label className="text-xs text-muted-foreground">Submitted Documents</Label>
                                <div className="flex flex-wrap gap-2">
                                    {quote.submittedDocuments.split(",").map(d => d.trim()).filter(Boolean).map((doc, i) => (
                                        <a
                                            key={i}
                                            href={docUrl(doc)}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-muted text-blue-600 hover:text-blue-800 hover:underline"
                                        >
                                            <ExternalLink className="h-3 w-3" />
                                            {doc}
                                        </a>
                                    ))}
                                </div>
                            </div>
                        )}
                        {quote.contacts && quote.contacts.length > 0 && (
                            <div className="space-y-3 pt-4 border-t">
                                <div className="space-y-3">
                                    {quote.contacts.map((contact, idx) => (
                                        <div key={idx}>
                                            <Table>
                                                <TableBody>
                                                    <TableRow className="bg-muted/50">
                                                        <TableCell colSpan={4} className="font-semibold text-sm">
                                                            <User className="h-4 w-4 inline mr-2" /> Contact {idx + 1}
                                                        </TableCell>
                                                    </TableRow>
                                                    <TableRow className="hover:bg-muted/30 transition-colors">
                                                        <TableCell className="text-sm font-medium text-muted-foreground w-1/4">
                                                            <User className="h-4 w-4 inline mr-2" />Person Name
                                                        </TableCell>
                                                        <TableCell className="text-sm w-1/4">{contact.name || "—"}</TableCell>
                                                        <TableCell className="text-sm font-medium text-muted-foreground w-1/4">
                                                            <Briefcase className="h-4 w-4 inline mr-2" />Designation
                                                        </TableCell>
                                                        <TableCell className="text-sm w-1/4">{contact.designation || "—"}</TableCell>
                                                    </TableRow>
                                                    <TableRow className="hover:bg-muted/30 transition-colors">
                                                        <TableCell className="text-sm font-medium text-muted-foreground">
                                                            <Phone className="h-4 w-4 inline mr-2" />Phone
                                                        </TableCell>
                                                        <TableCell className="text-sm">{contact.phone || "—"}</TableCell>
                                                        <TableCell className="text-sm font-medium text-muted-foreground">
                                                            <Mail className="h-4 w-4 inline mr-2" />Email
                                                        </TableCell>
                                                        <TableCell className="text-sm">{contact.email || "—"}</TableCell>
                                                    </TableRow>
                                                </TableBody>
                                            </Table>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </>
                )}

                {/* Dropped-specific fields */}
                {isDropped && (
                    <>
                        {quote.missedReason && (
                            <div className="space-y-1 pt-4 border-t">
                                <Label className="text-xs text-muted-foreground">Missed Reason</Label>
                                <p className="text-sm text-destructive">{quote.missedReason}</p>
                            </div>
                        )}
                        {quote.oemName && (
                            <div className="space-y-1 pt-4 border-t">
                                <Label className="text-xs text-muted-foreground">OEM Name</Label>
                                <p className="text-sm">{quote.oemName}</p>
                            </div>
                        )}
                        {quote.preventRepeat && (
                            <div className="space-y-1 pt-4 border-t">
                                <Label className="text-xs text-muted-foreground">Prevent Repeat</Label>
                                <p className="text-sm">{quote.preventRepeat}</p>
                            </div>
                        )}
                        {quote.tmsImprovement && (
                            <div className="space-y-1 pt-4 border-t">
                                <Label className="text-xs text-muted-foreground">TMS Improvement</Label>
                                <p className="text-sm">{quote.tmsImprovement}</p>
                            </div>
                        )}
                    </>
                )}

                {/* Costing sheet link for all statuses */}
                {quote.sheetUrl && (
                    <div className="flex gap-2 pt-4 border-t">
                        <Button variant="outline" size="sm" asChild>
                            <a href={quote.sheetUrl} target="_blank" rel="noopener noreferrer">
                                <ExternalLink className="h-4 w-4 mr-1" />
                                Open Costing Sheet
                            </a>
                        </Button>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

export function QuotationDetailsSection({ quoteId }: { quoteId: number | null }) {
    const { data: quote, isLoading } = useLeadsQuotation(quoteId);

    if (isLoading && !quote) {
        return <div className="flex items-center justify-center py-8 text-muted-foreground">Loading quotation...</div>;
    }

    return (
        <div className="space-y-6">
            {quote ? (
                <QuotationView quote={quote} />
            ) : (
                <p className="text-sm text-muted-foreground py-4 text-center">Quotation not available.</p>
            )}
        </div>
    );
}

export function LeadQuotationsSection({ leadId }: { leadId: number }) {
    const { data: quotations, isLoading } = useQuery({
        queryKey: ['leads-quotations', 'by-lead', leadId],
        queryFn: () => leadsQuotationService.getByLeadId(leadId),
    });

    if (isLoading) {
        return <div className="flex items-center justify-center py-8 text-muted-foreground">Loading quotations...</div>;
    }

    if (!quotations?.length) {
        return <p className="text-sm text-muted-foreground py-4 text-center">No quotations found for this lead.</p>;
    }

    return (
        <div className="space-y-4">
            {quotations.map((q) => (
                <QuotationView key={q.id} quote={q} />
            ))}
        </div>
    );
}

// ── View Page with ShowPageLayout (6-step lead stepper) ──────────────────────

interface LeadsQuotationViewPageProps {
    quoteId: number;
    onBack?: () => void;
    backLabel?: string;
}

export function LeadsQuotationViewPage({ quoteId, onBack, backLabel }: LeadsQuotationViewPageProps) {
    const { data: quote } = useLeadsQuotation(quoteId ?? null);
    const enquiryId = quote?.enquiryId ?? null;
    const { data: enquiry } = useLeadEnquiry(enquiryId);
    const leadId = enquiry?.leadId ?? null;
    const stepStatuses = useLeadStepStatuses(leadId);
    const updateQuote = useUpdateQuote();

    const steps = useMemo<StepConfig[]>(() => stepStatuses.map(s => ({
        id: s.id,
        label: s.label,
        shortLabel: s.shortLabel,
        stepNumber: s.stepNumber,
        status: s.status,
        hasData: s.hasData,
        isLoading: s.isLoading,
    })), [stepStatuses]);

    const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(["quotations"]));

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

    const [submissionModal, setSubmissionModal] = useState<{
        open: boolean;
        quote: PrivateQuote | null;
    }>({ open: false, quote: null });
    const [droppedModal, setDroppedModal] = useState<{
        open: boolean;
        quote: PrivateQuote | null;
    }>({ open: false, quote: null });

    const handleSubmissionConfirm = async (data: {
        quoteSubmissionDatetime: string;
        submittedDocuments: string;
        contacts: ContactEntry[];
    }) => {
        await updateQuote.mutateAsync({
            id: quoteId,
            data: { ...data, status: "Quotation Submitted" },
        });
    };

    const handleDroppedConfirm = async (data: {
        missedReason: string;
        oemVendorId: number | null;
        preventRepeat: string;
        tmsImprovement: string;
    }) => {
        await updateQuote.mutateAsync({
            id: quoteId,
            data: { ...data, status: "Quotation Dropped" },
        });
    };

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
                return <QuotationDetailsSection quoteId={quoteId} />;
            case "enquiry-result":
                return <EnquiryResultSection leadId={leadId} />;
            default:
                return null;
        }
    }, [leadId, quoteId]);

    return (
        <>
            {quote && quote.status === 'Submission Pending' && (
                <div className="flex items-center justify-between mb-4">
                    <div />
                    <div className="flex gap-2">
                        <Button onClick={() => setSubmissionModal({ open: true, quote })}>
                            Submit Quote
                        </Button>
                        <Button variant="destructive" onClick={() => setDroppedModal({ open: true, quote })}>
                            Mark as Dropped
                        </Button>
                    </div>
                </div>
            )}

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

            <QuoteSubmissionModal
                open={submissionModal.open}
                onOpenChange={(open) => setSubmissionModal({ ...submissionModal, open })}
                quote={submissionModal.quote}
                onConfirm={handleSubmissionConfirm}
            />

            <QuotationDroppedModal
                open={droppedModal.open}
                onOpenChange={(open) => setDroppedModal({ ...droppedModal, open })}
                quote={droppedModal.quote}
                onConfirm={handleDroppedConfirm}
            />
        </>
    );
}
