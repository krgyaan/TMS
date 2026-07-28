import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { useLeadsQuotation, useUpdateQuote } from "@/hooks/api/useLeadsQuotation";
import { ExternalLink, ArrowLeft } from "lucide-react";
import { QuoteSubmissionModal } from "./components/QuoteSubmissionModal";
import { QuotationDroppedModal } from "./components/QuotationDroppedModal";
import type { PrivateQuote } from "./helpers/leads-quotation.type";
import { paths } from "@/app/routes/paths";

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

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t">
                    <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Quote Submission Date</Label>
                        <p className="font-medium">{quote.quoteSubmissionDatetime ? formatDateTime(quote.quoteSubmissionDatetime) : "—"}</p>
                    </div>
                    <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Created At</Label>
                        <p className="font-medium">{quote.createdAt ? formatDateTime(quote.createdAt) : "—"}</p>
                    </div>
                </div>

                {quote.submittedDocuments && (
                    <div className="space-y-1 pt-4 border-t">
                        <Label className="text-xs text-muted-foreground">Submitted Documents</Label>
                        <p className="text-sm">{quote.submittedDocuments}</p>
                    </div>
                )}
                {quote.contacts && (
                    <div className="space-y-1 pt-4 border-t">
                        <Label className="text-xs text-muted-foreground">Contacts</Label>
                        <p className="text-sm">{quote.contacts}</p>
                    </div>
                )}
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

const LeadsQuotationShowPage = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const quoteId = id ? Number(id) : null;
    const { data: quote, isLoading, error } = useLeadsQuotation(quoteId ?? null);
    const updateQuote = useUpdateQuote();

    const [submissionModal, setSubmissionModal] = useState<{
        open: boolean;
        quote: PrivateQuote | null;
    }>({ open: false, quote: null });
    const [droppedModal, setDroppedModal] = useState<{
        open: boolean;
        quote: PrivateQuote | null;
    }>({ open: false, quote: null });

    if (isLoading) {
        return <div className="flex items-center justify-center py-12 text-muted-foreground">Loading quotation...</div>;
    }

    if (error || !quote) {
        return (
            <div className="p-8 text-center">
                <p className="text-destructive">Failed to load quotation</p>
                <Button variant="outline" onClick={() => navigate(paths.crm.leadsQuotations)} className="mt-4">
                    Back to Quotations
                </Button>
            </div>
        );
    }

    const handleSubmissionConfirm = async (data: {
        quoteSubmissionDatetime: string;
        submittedDocuments: string;
        contacts: import("@/modules/crm/leads-quotation/helpers/leads-quotation.type").ContactEntry[];
    }) => {
        await updateQuote.mutateAsync({
            id: quote.id,
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
            id: quote.id,
            data: { ...data, status: "Quotation Dropped" },
        });
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => navigate(paths.crm.leadsQuotations)}>
                        <ArrowLeft className="h-4 w-4 mr-1" />
                        Back to Quotations
                    </Button>
                    <h1 className="text-2xl font-bold">Quotation Details</h1>
                </div>
                <div className="flex items-center gap-2">
                    <Badge variant={getStatusVariant(quote.status)}>
                        {quote.status || "—"}
                    </Badge>
                </div>
            </div>

            <QuotationView quote={quote} />

            {quote.status === 'Submission Pending' && (
                <div className="flex gap-2">
                    <Button onClick={() => setSubmissionModal({ open: true, quote })}>
                        Submit Quote
                    </Button>
                    <Button variant="destructive" onClick={() => setDroppedModal({ open: true, quote })}>
                        Mark as Dropped
                    </Button>
                </div>
            )}

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
        </div>
    );
};

export default LeadsQuotationShowPage;
