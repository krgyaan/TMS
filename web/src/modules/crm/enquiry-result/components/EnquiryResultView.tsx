import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { Eye } from "lucide-react";
import { fileUploadService } from "@/services/api/file-upload.service";
import type { EnquiryResultWithDetails } from "../helpers/enquiry-result.type";

const docUrl = (doc: string): string =>
    doc.includes("/") ? fileUploadService.getFileUrl(doc) : `/uploads/crm/enquiry-results/${doc}`;

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
    const showResultSection = hasResultData(result);

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
