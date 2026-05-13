import { Table, TableBody, TableRow, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { formatINR } from "@/hooks/useINRFormatter";
import { formatDate } from "@/hooks/useFormatedDate";
import { formatValue, getStatusBadgeVariant, getReadableStatusName, BI_STATUSES } from "../../constants";

interface FdrDetails {
    fdrNo?: string | null;
    fdrDate?: string | Date | null;
    fdrSource?: string | null;
    fdrPurpose?: string | null;
    fdrExpiryDate?: string | Date | null;
    fdrNeeds?: string | null;
    fdrRemark?: string | null;
}

interface Instrument {
    id: number;
    instrumentType: string;
    amount: string | number;
    favouring?: string | null;
    payableAt?: string | null;
    issueDate?: string | Date | null;
    expiryDate?: string | Date | null;
    claimExpiryDate?: string | Date | null;
    status: string;
    action?: number | null;
    generatedPdf?: string | null;
    cancelPdf?: string | null;
    docketSlip?: string | null;
    coveringLetter?: string | null;
    details?: FdrDetails | null;
    utr?: string | null;
    reqNo?: string | null;
    referenceNo?: string | null;
    transferDate?: string | Date | null;
}

interface FdrViewProps {
    instruments: Instrument[];
    isNonTms: boolean;
}

const hasValue = (value?: string | Date | number | null) => {
    return value !== null && value !== undefined && value !== "";
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
                {label || "View Document"}
            </a>
        );
    }

    const baseUrl = "https://tmsv2.volksenergie.in/uploads/";
    let cleanPath = path.replace(/^\/+/, "").replace(/^uploads\//, "");
    
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
            {label || "View Document"}
        </a>
    );
};

export const FdrView = ({ instruments }: FdrViewProps) => {
    if (!instruments || instruments.length === 0) {
        return (
            <div className="text-sm text-muted-foreground py-4">
                No FDR instruments found.
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {instruments.map((instrument, idx) => (
                <div key={instrument.id || idx} className="border rounded-lg overflow-hidden">
                    <Table>
                        <TableBody>
                            <TableRow className="bg-muted/50">
                                <TableCell colSpan={4} className="font-semibold text-sm">
                                    Fixed Deposit Receipt #{idx + 1}
                                </TableCell>
                            </TableRow>
                            <TableRow className="hover:bg-muted/30">
                                <TableCell className="text-sm font-medium text-muted-foreground">Status</TableCell>
                                <TableCell colSpan={3}>
                                    <Badge variant={getStatusBadgeVariant(instrument.status) as any}>
                                        {getReadableStatusName(instrument.status as keyof typeof BI_STATUSES)}
                                    </Badge>
                                </TableCell>
                            </TableRow>
                            <TableRow className="hover:bg-muted/30">
                                <TableCell className="text-sm font-medium text-muted-foreground">Amount</TableCell>
                                <TableCell className="text-sm font-semibold">{formatINR(instrument.amount)}</TableCell>
                                <TableCell className="text-sm font-medium text-muted-foreground">Favouring</TableCell>
                                <TableCell className="text-sm">{formatValue(instrument.favouring)}</TableCell>
                            </TableRow>
                            {hasValue(instrument.payableAt) && (
                                <TableRow className="hover:bg-muted/30">
                                    <TableCell className="text-sm font-medium text-muted-foreground">Payable At</TableCell>
                                    <TableCell colSpan={3} className="text-sm whitespace-normal">{formatValue(instrument.payableAt)}</TableCell>
                                </TableRow>
                            )}
                            {hasValue(instrument.issueDate) && (
                                <TableRow className="hover:bg-muted/30">
                                    <TableCell className="text-sm font-medium text-muted-foreground">Issue Date</TableCell>
                                    <TableCell className="text-sm">{formatDate(instrument.issueDate)}</TableCell>
                                    {hasValue(instrument.details?.fdrDate) && (
                                        <>
                                            <TableCell className="text-sm font-medium text-muted-foreground">FDR Date</TableCell>
                                            <TableCell className="text-sm">{formatDate(instrument.details?.fdrDate)}</TableCell>
                                        </>
                                    )}
                                </TableRow>
                            )}
                            {hasValue(instrument.expiryDate) && (
                                <TableRow className="hover:bg-muted/30">
                                    <TableCell className="text-sm font-medium text-muted-foreground">Expiry Date</TableCell>
                                    <TableCell className="text-sm">{formatDate(instrument.expiryDate)}</TableCell>
                                    {hasValue(instrument.details?.fdrExpiryDate) && (
                                        <>
                                            <TableCell className="text-sm font-medium text-muted-foreground">FDR Expiry</TableCell>
                                            <TableCell className="text-sm">{formatDate(instrument.details?.fdrExpiryDate)}</TableCell>
                                        </>
                                    )}
                                </TableRow>
                            )}
                            {hasValue(instrument.details?.fdrNo) && (
                                <TableRow className="hover:bg-muted/30">
                                    <TableCell className="text-sm font-medium text-muted-foreground">FDR Number</TableCell>
                                    <TableCell colSpan={3} className="text-sm">{instrument.details?.fdrNo}</TableCell>
                                </TableRow>
                            )}
                            {hasValue(instrument.details?.fdrSource) && (
                                <TableRow className="hover:bg-muted/30">
                                    <TableCell className="text-sm font-medium text-muted-foreground">FDR Source</TableCell>
                                    <TableCell colSpan={3} className="text-sm">{instrument.details?.fdrSource}</TableCell>
                                </TableRow>
                            )}
                            {hasValue(instrument.details?.fdrNeeds) && (
                                <TableRow className="hover:bg-muted/30">
                                    <TableCell className="text-sm font-medium text-muted-foreground">FDR Needs</TableCell>
                                    <TableCell colSpan={3} className="text-sm">{instrument.details?.fdrNeeds}</TableCell>
                                </TableRow>
                            )}
                            {hasValue(instrument.details?.fdrPurpose) && (
                                <TableRow className="hover:bg-muted/30">
                                    <TableCell className="text-sm font-medium text-muted-foreground">FDR Purpose</TableCell>
                                    <TableCell colSpan={3} className="text-sm">{instrument.details?.fdrPurpose}</TableCell>
                                </TableRow>
                            )}
                            {hasValue(instrument.details?.fdrRemark) && (
                                <TableRow className="hover:bg-muted/30">
                                    <TableCell className="text-sm font-medium text-muted-foreground">Remarks</TableCell>
                                    <TableCell colSpan={3} className="text-sm">{instrument.details?.fdrRemark}</TableCell>
                                </TableRow>
                            )}
                            {(instrument.generatedPdf || instrument.docketSlip || instrument.cancelPdf || instrument.coveringLetter) && (
                                <TableRow className="hover:bg-muted/30">
                                    <TableCell className="text-sm font-medium text-muted-foreground">Documents</TableCell>
                                    <TableCell colSpan={3} className="text-sm">
                                        <div className="flex flex-wrap gap-4">
                                            {instrument.generatedPdf && renderFileLink(instrument.generatedPdf, "Generated FDR")}
                                            {instrument.docketSlip && renderFileLink(instrument.docketSlip, "Docket Slip")}
                                            {instrument.cancelPdf && renderFileLink(instrument.cancelPdf, "Cancellation PDF")}
                                            {instrument.coveringLetter && renderFileLink(instrument.coveringLetter, "Covering Letter")}
                                        </div>
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
            ))}
        </div>
    );
};