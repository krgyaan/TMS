import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { Calendar, Clock, User, Phone, Mail, Briefcase, Eye } from "lucide-react";
import { Table, TableBody, TableRow, TableCell } from "@/components/ui/table";
import { fileUploadService } from "@/services/api/file-upload.service";
import type { EnquiryResultWithDetails } from "../helpers/enquiry-result.type";

const docUrl = (doc: string): string =>
    doc.includes("/") ? fileUploadService.getFileUrl(doc) : `/uploads/crm/enquiry-results/${doc}`;
import { useFollowupsByQuotation } from "@/hooks/api/useEnquiryResult";

function getStatusVariant(status?: string | null): "default" | "secondary" | "outline" | "destructive" {
    switch (status) {
        case "Quotation Submitted": return "default";
        case "Followup Initiated": return "secondary";
        case "Won": return "default";
        case "Lost": return "destructive";
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

function formatDate(dateStr?: string | null): string {
    if (!dateStr) return "—";
    try {
        return format(new Date(dateStr), "PP");
    } catch {
        return dateStr;
    }
}

function getFrequencyLabel(frequency: number | null | undefined): string {
    if (frequency == null) return "—";
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

function FollowupDetails({ followup }: { followup: any }) {
    return (
        <div className="border rounded-lg p-4 bg-muted/30 space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Follow-up Start Date</Label>
                    <p className="text-sm font-medium flex items-center gap-1.5">
                        <Calendar className="h-3 w-3 text-muted-foreground" />
                        {formatDate(followup.startFrom)}
                    </p>
                </div>
                <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Next Follow-up Date</Label>
                    <p className="text-sm font-medium flex items-center gap-1.5">
                        <Calendar className="h-3 w-3 text-muted-foreground" />
                        {followup.nextFollowUpDate ? formatDate(followup.nextFollowUpDate) : "—"}
                    </p>
                </div>
                <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Frequency</Label>
                    <p className="text-sm font-medium flex items-center gap-1.5">
                        <Clock className="h-3 w-3 text-muted-foreground" />
                        {getFrequencyLabel(followup.frequency)}
                    </p>
                </div>
            </div>

            {followup.contacts && followup.contacts.length > 0 && (
                <div>
                    <Label className="text-xs text-muted-foreground">Contacts</Label>
                    <div className="space-y-3 mt-1">
                        {followup.contacts.map((contact: any, idx: number) => (
                            <Table key={idx}>
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
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

function hasResultData(result: EnquiryResultWithDetails): boolean {
    return (
        result.technicallyQualified != null ||
        !!result.disqualificationReason ||
        result.qualifiedCount != null ||
        !!result.result ||
        !!result.l1Price ||
        !!result.l2Price ||
        !!result.ourPrice ||
        !!result.uploadScreenshot ||
        !!result.uploadDocuments
    );
}

export function EnquiryResultView({ result, className }: { result: EnquiryResultWithDetails; className?: string }) {
    const { data: followups, isLoading: followupsLoading } = useFollowupsByQuotation(result.quotationId ?? null);

    const showResultSection = hasResultData(result);
    const showFollowups = !!result.quotationId && !followupsLoading && followups && followups.length > 0;

    return (
        <Card className={cn("mb-6", className)}>
            <CardHeader>
                <div className="flex items-start justify-between">
                    <div>
                        <CardTitle className="flex items-center gap-2">
                            Enquiry Result
                            <Badge variant={getStatusVariant(result.status)}>
                                {result.status || "—"}
                            </Badge>
                        </CardTitle>
                        <CardDescription>
                            {result.enquiryNumber && `Enquiry: ${result.enquiryNumber}`}
                        </CardDescription>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Enquiry Name</Label>
                        <p className="font-medium">{result.enqName || "—"}</p>
                    </div>
                    <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Item</Label>
                        <p className="font-medium">{result.itemName || "—"}</p>
                    </div>
                    <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">BD Lead</Label>
                        <p className="font-medium">{result.createdByName || "—"}</p>
                    </div>
                    <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Quote Submission Date</Label>
                        <p className="font-medium">{result.quoteSubmissionDatetime ? formatDateTime(result.quoteSubmissionDatetime) : "—"}</p>
                    </div>
                    <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Final Price</Label>
                        <p className="font-medium">
                            {result.approvedFinalPrice
                                ? `₹${result.approvedFinalPrice} (Approved)`
                                : result.finalPrice
                                    ? `₹${result.finalPrice}`
                                    : "—"}
                        </p>
                    </div>
                </div>

                {showFollowups && (
                    <div className="pt-4 border-t">
                        <Label className="text-xs text-muted-foreground uppercase tracking-wide">Follow-up Details</Label>
                        <div className="space-y-3 mt-2">
                            {followups.map((followup: any) => (
                                <FollowupDetails key={followup.id} followup={followup} />
                            ))}
                        </div>
                    </div>
                )}

                {showResultSection && (
                    <>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t">
                            <div className="space-y-1">
                                <Label className="text-xs text-muted-foreground">Technically Qualified</Label>
                                <p className="font-medium">
                                    {result.technicallyQualified === true ? "Yes" : result.technicallyQualified === false ? "No" : "—"}
                                </p>
                            </div>
                            <div className="space-y-1">
                                <Label className="text-xs text-muted-foreground">Disqualification Reason</Label>
                                <p className="font-medium">{result.disqualificationReason || "—"}</p>
                            </div>
                            <div className="space-y-1">
                                <Label className="text-xs text-muted-foreground">Qualified Count</Label>
                                <p className="font-medium">{result.qualifiedCount ?? "—"}</p>
                            </div>
                            <div className="space-y-1">
                                <Label className="text-xs text-muted-foreground">Result</Label>
                                <p className="font-medium">{result.result ? (result.result === 'won' ? 'Won' : 'Lost') : "—"}</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t">
                            <div className="space-y-1">
                                <Label className="text-xs text-muted-foreground">L1 Price</Label>
                                <p className="font-medium">{result.l1Price ? `₹${result.l1Price}` : "—"}</p>
                            </div>
                            <div className="space-y-1">
                                <Label className="text-xs text-muted-foreground">L2 Price</Label>
                                <p className="font-medium">{result.l2Price ? `₹${result.l2Price}` : "—"}</p>
                            </div>
                            <div className="space-y-1">
                                <Label className="text-xs text-muted-foreground">Our Price</Label>
                                <p className="font-medium">{result.ourPrice ? `₹${result.ourPrice}` : "—"}</p>
                            </div>
                        </div>

                        {(result.status === 'Won' || result.status === 'Lost') && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t">
                                <div className="space-y-1">
                                    <Label className="text-xs text-muted-foreground">Upload Screenshot</Label>
                                    {result.uploadScreenshot ? (
                                        <div className="flex flex-wrap gap-2">
                                            {result.uploadScreenshot.split(",").map(s => s.trim()).filter(Boolean).map((doc, i) => (
                                                <a
                                                    key={i}
                                                    href={docUrl(doc)}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-muted text-blue-600 hover:text-blue-800 hover:underline"
                                                >
                                                    <Eye className="h-3 w-3" />
                                                    {doc}
                                                </a>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="font-medium">—</p>
                                    )}
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-xs text-muted-foreground">Final Result</Label>
                                    {result.uploadDocuments ? (
                                        <div className="flex flex-wrap gap-2">
                                            {result.uploadDocuments.split(",").map(s => s.trim()).filter(Boolean).map((doc, i) => (
                                                <a
                                                    key={i}
                                                    href={docUrl(doc)}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-muted text-blue-600 hover:text-blue-800 hover:underline"
                                                >
                                                    <Eye className="h-3 w-3" />
                                                    {doc}
                                                </a>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="font-medium">—</p>
                                    )}
                                </div>
                            </div>
                        )}
                    </>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t">
                    <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Created At</Label>
                        <p className="font-medium">{result.createdAt ? formatDateTime(result.createdAt) : "—"}</p>
                    </div>
                    <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Updated At</Label>
                        <p className="font-medium">{result.updatedAt ? formatDateTime(result.updatedAt) : "—"}</p>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
