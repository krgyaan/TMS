import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableRow, TableCell } from "@/components/ui/table";
import { FileText } from "lucide-react";
import type { TenderInfoWithNames } from "@/modules/tendering/tenders/helpers/tenderInfo.types";
import { formatDateTime, formatDate } from "@/hooks/useFormatedDate";
import { formatINR } from "@/hooks/useINRFormatter";
import { BI_STATUSES, formatValue, getReadableStatusName, getStatusBadgeVariant } from "../constants";

interface PaymentRequest {
    id: number;
    tenderId: number;
    purpose: "EMD" | "Tender Fee" | "Processing Fee";
    amountRequired: string | number;
    dueDate: string | Date | null;
    createdAt: string | Date | null;
    requestedBy?: string | null;
    instruments?: Array<{
        id: number;
        instrumentType: string;
        amount: string | number;
        favouring?: string | null;
        payableAt?: string | null;
        issueDate?: string | Date | null;
        expiryDate?: string | Date | null;
        claimExpiryDate?: string | Date | null;
        courierAddress?: string | null;
        courierDeadline?: number | null;
        status: string;
        details?: any;
        action?: string;
        generatedPdf?: string | null;
        cancelPdf?: string | null;
        docketSlip?: string | null;
        coveringLetter?: string | null;
        extraPdfPaths?: string | null;
        extensionRequestPdf?: string | null;
        cancellationRequestPdf?: string | null;
    }>;
}

interface EmdTenderFeeShowProps {
    paymentRequests?: PaymentRequest[] | null;
    tender?: TenderInfoWithNames | null;
    isLoading?: boolean;
}

const hasValue = (value?: string | Date | number | null) => {
    return value !== null && value !== undefined && value !== "";
};

const formatKey = (key: string) => {
    const k = key.toLowerCase();
    if (k.endsWith("neededin") || k.endsWith("needs") || k === "needs") return "Instrument Needs";
    if (k.endsWith("purpose") || k.endsWith("reason") || k === "reason") return "Instrument Purpose";
    
    return key
        .replace(/([A-Z])/g, " $1")
        .trim()
        .replace(/\bdd\b/gi, "DD")
        .replace(/\bfdr\b/gi, "FDR")
        .replace(/\bbg\b/gi, "BG")
        .replace(/\bid\b/gi, "ID")
};

const formatSmartDate = (date: string | Date | null | undefined) => {
    if (!date) return "—";
    
    // If it's a string that matches YYYY-MM-DD exactly, it's definitely date-only
    if (typeof date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(date.trim())) {
        return formatDate(date);
    }

    const d = typeof date === "string" 
        ? new Date(date.includes(" ") && !date.includes("T") ? date.replace(" ", "T") : date) 
        : date;
    
    if (isNaN(d.getTime())) return "—";

    // If time is exactly midnight in Asia/Kolkata (12:00 am) 
    // OR exactly UTC midnight (which appears as 05:30 am in IST), we treat it as date-only
    const timeStr = d.toLocaleTimeString("en-IN", { timeZone: "Asia/Kolkata", hour12: true, hour: "2-digit", minute: "2-digit", second: "2-digit" });
    if (timeStr === "12:00:00 am" || timeStr === "05:30:00 am") {
        return formatDate(date);
    }
    
    return formatDateTime(date);
};

const renderFileLink = (path: string, label?: string) => {
    if (!path) return null;
    
    if (path.startsWith("http")) {
        return (
            <a 
                href={path} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-primary hover:underline inline-flex items-center gap-1 font-medium"
            >
                <FileText className="h-3 w-3" />
                {label || "View Document"}
            </a>
        );
    }

    const baseUrl = "https://tmsv2.volksenergie.in/uploads/";
    let cleanPath = path.replace(/^\/+/, "").replace(/^uploads\//, "");

    // Intelligent folder prefixing
    if (cleanPath.includes("prefilled-signed") || cleanPath.includes("covering-letter") || cleanPath.includes("extension-letter")) {
        if (!cleanPath.startsWith("tendering/")) {
            cleanPath = `tendering/${cleanPath}`;
        }
    } else if (!cleanPath.includes("/") || cleanPath.startsWith("whatsapp") || cleanPath.includes("cheque")) {
        if (!cleanPath.startsWith("accounts/")) {
            cleanPath = `accounts/${cleanPath}`;
        }
    }
    
    const url = `${baseUrl}${cleanPath}`;
    return (
        <a 
            href={url} 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-primary hover:underline inline-flex items-center gap-1 font-medium"
        >
            <FileText className="h-3 w-3" />
            {label || "View Document"}
        </a>
    );
};

const renderValue = (value: any) => {
    if (value === null || value === undefined || value === "") return "—";

    // Handle File Paths
    if (typeof value === "string") {
        const lower = value.toLowerCase();
        
        // Attempt to parse if it looks like a JSON array
        if (lower.startsWith("[") && lower.endsWith("]")) {
            try {
                const parsed = JSON.parse(value);
                if (Array.isArray(parsed)) return renderValue(parsed);
            } catch (e) {
                // Not a valid JSON array, continue
            }
        }

        const isPath = /\.(pdf|jpg|jpeg|png|doc|docx|xls|xlsx|csv)$/i.test(lower.trim());
        
        if (isPath) {
            return renderFileLink(value);
        }
    }

    // Handle Arrays
    if (Array.isArray(value)) {
        return (
            <div className="flex flex-col gap-1">
                {value.map((v, i) => (
                    <div key={i} className="flex items-center gap-1">
                        {renderValue(v)}
                    </div>
                ))}
            </div>
        );
    }

    // Handle Dates
    if (value instanceof Date || (typeof value === "string" && !isNaN(Date.parse(value)) && /^\d{4}-\d{2}-\d{2}/.test(value))) {
        return formatSmartDate(value);
    }

    return String(value);
};

export const EmdTenderFeeShow = ({ paymentRequests, isLoading }: EmdTenderFeeShowProps) => {
    if (isLoading) {
        return (
            <Card>
                <CardHeader className="pb-3">
                    <Skeleton className="h-5 w-40" />
                </CardHeader>
                <CardContent className="pt-0">
                    <div className="space-y-2">
                        {Array.from({ length: 4 }).map((_, idx) => (
                            <Skeleton key={idx} className="h-10 w-full" />
                        ))}
                    </div>
                </CardContent>
            </Card>
        );
    }

    if (!paymentRequests || paymentRequests.length === 0) {
        return (
            <Card>
                <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        Payment Requests Details
                    </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                    <div className="flex flex-col items-center justify-center py-6 text-muted-foreground">
                        <FileText className="h-8 w-8 mb-2 opacity-50" />
                        <p className="text-sm">No payment requests available for this tender.</p>
                    </div>
                </CardContent>
            </Card>
        );
    }

    const emdRequest = paymentRequests.find(r => r.purpose === "EMD");
    const tenderFeeRequest = paymentRequests.find(r => r.purpose === "Tender Fee");
    const processingFeeRequest = paymentRequests.find(r => r.purpose === "Processing Fee");

    const renderInstrumentRows = (instruments: PaymentRequest["instruments"], purposeLabel: string) => {
        if (!instruments || instruments.length === 0) return null;

        return (
            <>
                <TableRow className="bg-muted/30">
                    <TableCell colSpan={4} className="font-medium text-sm italic">
                        {purposeLabel} - Instrument Details
                    </TableCell>
                </TableRow>
                {instruments.map((instrument, idx) => (
                    <>
                        {/* Instrument Header Row */}
                        <TableRow key={`${instrument.id || idx}-header`} className="hover:bg-muted/30 transition-colors border-l-4 border-l-primary/30">
                            <TableCell className="text-sm font-medium text-muted-foreground">Instrument Type</TableCell>
                            <TableCell className="text-sm font-semibold">{instrument.instrumentType}</TableCell>
                            <TableCell className="text-sm font-medium text-muted-foreground">Status</TableCell>
                            <TableCell>
                                <Badge variant={getStatusBadgeVariant(instrument.status) as any}>{getReadableStatusName(instrument.status as keyof typeof BI_STATUSES)}</Badge>
                                {/* <span>{instrument.action}</span> */}
                            </TableCell>
                        </TableRow>

                        {/* Instrument Amount & Favouring Row */}
                        <TableRow key={`${instrument.id || idx}-amount`} className="hover:bg-muted/30 transition-colors border-l-4 border-l-primary/30">
                            <TableCell className="text-sm font-medium text-muted-foreground">Amount</TableCell>
                            <TableCell className="text-sm font-semibold" colSpan={hasValue(instrument.favouring) ? 1 : 3}>
                                {formatINR(instrument.amount)}
                            </TableCell>
                            {hasValue(instrument.favouring) && (
                                <>
                                    <TableCell className="text-sm font-medium text-muted-foreground">Favouring</TableCell>
                                    <TableCell className="text-sm whitespace-normal [overflow-wrap:anywhere]">{formatValue(instrument.favouring)}</TableCell>
                                </>
                            )}
                        </TableRow>

                        {/* Instrument Payable At & Issue Date Row */}
                        {(hasValue(instrument.payableAt) || hasValue(instrument.issueDate)) && (
                            <TableRow key={`${instrument.id || idx}-payable`} className="hover:bg-muted/30 transition-colors border-l-4 border-l-primary/30">
                                {hasValue(instrument.payableAt) ? (
                                    <>
                                        <TableCell className="text-sm font-medium text-muted-foreground">Payable At</TableCell>
                                        <TableCell className="text-sm whitespace-normal [overflow-wrap:anywhere]" colSpan={hasValue(instrument.issueDate) ? 1 : 3}>
                                            {formatValue(instrument.payableAt)}
                                        </TableCell>
                                    </>
                                ) : (
                                    <>
                                        <TableCell className="text-sm font-medium text-muted-foreground">Issue Date</TableCell>
                                        <TableCell className="text-sm" colSpan={3}>
                                            {formatSmartDate(instrument.issueDate)}
                                        </TableCell>
                                    </>
                                )}
                                {hasValue(instrument.payableAt) && hasValue(instrument.issueDate) && (
                                    <>
                                        <TableCell className="text-sm font-medium text-muted-foreground">Issue Date</TableCell>
                                        <TableCell className="text-sm">{formatSmartDate(instrument.issueDate)}</TableCell>
                                    </>
                                )}
                            </TableRow>
                        )}

                        {/* Instrument Expiry Dates Row */}
                        {(hasValue(instrument.expiryDate) || hasValue(instrument.claimExpiryDate)) && (
                            <TableRow key={`${instrument.id || idx}-expiry`} className="hover:bg-muted/30 transition-colors border-l-4 border-l-primary/30">
                                {hasValue(instrument.expiryDate) ? (
                                    <>
                                        <TableCell className="text-sm font-medium text-muted-foreground">Expiry Date</TableCell>
                                        <TableCell className="text-sm" colSpan={hasValue(instrument.claimExpiryDate) ? 1 : 3}>
                                            {formatSmartDate(instrument.expiryDate)}
                                        </TableCell>
                                    </>
                                ) : (
                                    <>
                                        <TableCell className="text-sm font-medium text-muted-foreground">Claim Expiry Date</TableCell>
                                        <TableCell className="text-sm" colSpan={3}>
                                            {formatSmartDate(instrument.claimExpiryDate)}
                                        </TableCell>
                                    </>
                                )}
                                {hasValue(instrument.expiryDate) && hasValue(instrument.claimExpiryDate) && (
                                    <>
                                        <TableCell className="text-sm font-medium text-muted-foreground">Claim Expiry Date</TableCell>
                                        <TableCell className="text-sm">{formatSmartDate(instrument.claimExpiryDate)}</TableCell>
                                    </>
                                )}
                            </TableRow>
                        )}

                        {/* Instrument Courier Details Row */}
                        {(instrument.courierAddress || instrument.courierDeadline) && (
                            <TableRow key={`${instrument.id || idx}-courier`} className="hover:bg-muted/30 transition-colors border-l-4 border-l-primary/30">
                                <TableCell className="text-sm font-medium text-muted-foreground">Courier Address</TableCell>
                                <TableCell className="text-sm whitespace-normal [overflow-wrap:anywhere]">{renderValue(instrument.courierAddress)}</TableCell>
                                <TableCell className="text-sm font-medium text-muted-foreground">Courier Deadline</TableCell>
                                <TableCell className="text-sm">{instrument.courierDeadline ? `${instrument.courierDeadline} days` : "—"}</TableCell>
                            </TableRow>
                        )}

                        {/* Instrument Documents Row */}
                        {(instrument.generatedPdf || instrument.docketSlip || instrument.cancelPdf || instrument.coveringLetter || instrument.extraPdfPaths) && (
                            <TableRow key={`${instrument.id || idx}-docs`} className="hover:bg-muted/30 transition-colors border-l-4 border-l-primary/30">
                                <TableCell className="text-sm font-medium text-muted-foreground">Documents</TableCell>
                                <TableCell className="text-sm" colSpan={3}>
                                    <div className="flex flex-wrap gap-4">
                                        {instrument.generatedPdf && renderFileLink(instrument.generatedPdf, "Generated Instrument")}
                                        {instrument.docketSlip && renderFileLink(instrument.docketSlip, "Docket Slip")}
                                        {instrument.cancelPdf && renderFileLink(instrument.cancelPdf, "Cancellation PDF")}
                                        {instrument.coveringLetter && renderFileLink(instrument.coveringLetter, "Covering Letter")}
                                        {instrument.extraPdfPaths && renderValue(instrument.extraPdfPaths)}
                                    </div>
                                </TableCell>
                            </TableRow>
                        )}

                        {/* Instrument Additional Details Rows */}
                        {instrument.details && Object.entries(instrument.details).length > 0 && (
                            <>
                                {(() => {
                                    const entries = Object.entries(instrument.details).filter(([key, value]) => value && !["updatedAt", "updated_at", "createdAt", "created_at"].includes(key));
                                    const rows = [];
                                    for (let i = 0; i < entries.length; i += 2) {
                                        const [key1, value1] = entries[i];
                                        const [key2, value2] = entries[i + 1] || [null, null];
                                        rows.push(
                                            <TableRow key={`${instrument.id || idx}-details-${i}`} className="hover:bg-muted/30 transition-colors border-l-4 border-l-primary/30">
                                                <TableCell className="text-sm font-medium text-muted-foreground capitalize">{formatKey(key1)}</TableCell>
                                                <TableCell className="text-sm whitespace-normal [overflow-wrap:anywhere]">
                                                    {renderValue(value1)}
                                                </TableCell>
                                                {key2 ? (
                                                    <>
                                                        <TableCell className="text-sm font-medium text-muted-foreground capitalize">
                                                            {formatKey(key2)}
                                                        </TableCell>
                                                        <TableCell className="text-sm whitespace-normal [overflow-wrap:anywhere]">
                                                            {renderValue(value2)}
                                                        </TableCell>
                                                    </>
                                                ) : (
                                                    <TableCell colSpan={2} />
                                                )}
                                            </TableRow>
                                        );
                                    }
                                    return rows;
                                })()}
                            </>
                        )}

                        {/* Spacer Row between instruments */}
                        {idx < instruments.length - 1 && (
                            <TableRow key={`${instrument.id || idx}-spacer`}>
                                <TableCell colSpan={4} className="h-2 bg-muted/10" />
                            </TableRow>
                        )}
                    </>
                ))}
            </>
        );
    };

    return (
        <Card>
            {/* <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Payment Requests Details
                </CardTitle>
            </CardHeader> */}
            <CardContent>
                <Table>
                    <TableBody>
                        {/* EMD Section */}
                        {emdRequest && (
                            <>
                                <TableRow className="bg-muted/50">
                                    <TableCell colSpan={4} className="font-semibold text-sm">
                                        EMD Payment
                                    </TableCell>
                                </TableRow>
                                <TableRow className="hover:bg-muted/30 transition-colors">
                                    <TableCell className="text-sm font-medium text-muted-foreground">Amount Required</TableCell>
                                    <TableCell className="text-sm font-semibold">{formatINR(emdRequest.amountRequired)}</TableCell>
                                    <TableCell className="text-sm font-medium text-muted-foreground">Request On</TableCell>
                                    <TableCell className="text-sm font-semibold">{formatSmartDate(emdRequest.createdAt)}</TableCell>
                                </TableRow>
                                <TableRow className="hover:bg-muted/30 transition-colors">
                                    <TableCell className="text-sm font-medium text-muted-foreground">Due Date</TableCell>
                                    <TableCell className="text-sm">{formatSmartDate(emdRequest.dueDate)}</TableCell>
                                    <TableCell className="text-sm font-medium text-muted-foreground">Requested By</TableCell>
                                    <TableCell className="text-sm">{emdRequest.requestedBy}</TableCell>
                                </TableRow>
                                {renderInstrumentRows(emdRequest.instruments, "EMD")}
                            </>
                        )}

                        {/* Tender Fee Section */}
                        {tenderFeeRequest && (
                            <>
                                <TableRow className="bg-muted/50">
                                    <TableCell colSpan={4} className="font-semibold text-sm">
                                        Tender Fee Payment
                                    </TableCell>
                                </TableRow>
                                <TableRow className="hover:bg-muted/30 transition-colors">
                                    <TableCell className="text-sm font-medium text-muted-foreground">Amount Required</TableCell>
                                    <TableCell className="text-sm font-semibold">{formatINR(tenderFeeRequest.amountRequired)}</TableCell>
                                    <TableCell className="text-sm font-medium text-muted-foreground">Request On</TableCell>
                                    <TableCell className="text-sm font-semibold">{formatSmartDate(tenderFeeRequest.createdAt)}</TableCell>
                                </TableRow>
                                <TableRow className="hover:bg-muted/30 transition-colors">
                                    <TableCell className="text-sm font-medium text-muted-foreground">Due Date</TableCell>
                                    <TableCell className="text-sm">{formatSmartDate(tenderFeeRequest.dueDate)}</TableCell>
                                    <TableCell className="text-sm font-medium text-muted-foreground">Requested By</TableCell>
                                    <TableCell className="text-sm">{tenderFeeRequest.requestedBy}</TableCell>
                                </TableRow>
                                {renderInstrumentRows(tenderFeeRequest.instruments, "Tender Fee")}
                            </>
                        )}

                        {/* Processing Fee Section */}
                        {processingFeeRequest && (
                            <>
                                <TableRow className="bg-muted/50">
                                    <TableCell colSpan={4} className="font-semibold text-sm">
                                        Processing Fee Payment
                                    </TableCell>
                                </TableRow>
                                <TableRow className="hover:bg-muted/30 transition-colors">
                                    <TableCell className="text-sm font-medium text-muted-foreground">Amount Required</TableCell>
                                    <TableCell className="text-sm font-semibold">{formatINR(processingFeeRequest.amountRequired)}</TableCell>
                                    <TableCell className="text-sm font-medium text-muted-foreground">Request On</TableCell>
                                    <TableCell className="text-sm font-semibold">{formatSmartDate(processingFeeRequest.createdAt)}</TableCell>
                                </TableRow>
                                <TableRow className="hover:bg-muted/30 transition-colors">
                                    <TableCell className="text-sm font-medium text-muted-foreground">Due Date</TableCell>
                                    <TableCell className="text-sm">{formatSmartDate(processingFeeRequest.dueDate)}</TableCell>
                                    <TableCell className="text-sm font-medium text-muted-foreground">Requested By</TableCell>
                                    <TableCell className="text-sm">{processingFeeRequest.requestedBy}</TableCell>
                                </TableRow>
                                {renderInstrumentRows(processingFeeRequest.instruments, "Processing Fee")}
                            </>
                        )}

                        {/* Summary Row */}
                        <TableRow className="bg-primary/10">
                            <TableCell colSpan={2} className="font-bold text-sm">
                                Total Amount Required
                            </TableCell>
                            <TableCell colSpan={2} className="font-bold text-sm">
                                {formatINR(
                                    (Number(emdRequest?.amountRequired) || 0) +
                                    (Number(tenderFeeRequest?.amountRequired) || 0) +
                                    (Number(processingFeeRequest?.amountRequired) || 0)
                                )}
                            </TableCell>
                        </TableRow>
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
};
