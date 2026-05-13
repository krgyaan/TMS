import { Table, TableBody, TableRow, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { formatINR } from "@/hooks/useINRFormatter";
import { formatDate } from "@/hooks/useFormatedDate";
import { formatValue, getStatusBadgeVariant, getReadableStatusName, BI_STATUSES } from "../../constants";

interface TransferDetails {
    utrNum?: string | null;
    transactionDate?: string | Date | null;
    accountName?: string | null;
    accountNumber?: string | null;
    ifsc?: string | null;
    reason?: string | null;
    remarks?: string | null;
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
    details?: TransferDetails | null;
    utr?: string | null;
    reqNo?: string | null;
    referenceNo?: string | null;
    transferDate?: string | Date | null;
}

interface BankTransferViewProps {
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

export const BankTransferView = ({ instruments }: BankTransferViewProps) => {
    if (!instruments || instruments.length === 0) {
        return (
            <div className="text-sm text-muted-foreground py-4">
                No Bank Transfer instruments found.
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
                                    Bank Transfer #{idx + 1}
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
                                <TableCell className="text-sm font-medium text-muted-foreground">UTR Number</TableCell>
                                <TableCell className="text-sm">{formatValue(instrument.utr || instrument.details?.utrNum)}</TableCell>
                            </TableRow>
                            {hasValue(instrument.details?.accountName) && (
                                <TableRow className="hover:bg-muted/30">
                                    <TableCell className="text-sm font-medium text-muted-foreground">Account Name</TableCell>
                                    <TableCell colSpan={3} className="text-sm">{instrument.details?.accountName}</TableCell>
                                </TableRow>
                            )}
                            {hasValue(instrument.details?.accountNumber) && (
                                <TableRow className="hover:bg-muted/30">
                                    <TableCell className="text-sm font-medium text-muted-foreground">Account Number</TableCell>
                                    <TableCell colSpan={3} className="text-sm font-mono">{instrument.details?.accountNumber}</TableCell>
                                </TableRow>
                            )}
                            {hasValue(instrument.details?.ifsc) && (
                                <TableRow className="hover:bg-muted/30">
                                    <TableCell className="text-sm font-medium text-muted-foreground">IFSC Code</TableCell>
                                    <TableCell colSpan={3} className="text-sm font-mono">{instrument.details?.ifsc}</TableCell>
                                </TableRow>
                            )}
                            {hasValue(instrument.transferDate) && (
                                <TableRow className="hover:bg-muted/30">
                                    <TableCell className="text-sm font-medium text-muted-foreground">Transfer Date</TableCell>
                                    <TableCell colSpan={3} className="text-sm">{formatDate(instrument.transferDate)}</TableCell>
                                </TableRow>
                            )}
                            {hasValue(instrument.details?.reason) && (
                                <TableRow className="hover:bg-muted/30">
                                    <TableCell className="text-sm font-medium text-muted-foreground">Reason</TableCell>
                                    <TableCell colSpan={3} className="text-sm">{instrument.details?.reason}</TableCell>
                                </TableRow>
                            )}
                            {hasValue(instrument.details?.remarks) && (
                                <TableRow className="hover:bg-muted/30">
                                    <TableCell className="text-sm font-medium text-muted-foreground">Remarks</TableCell>
                                    <TableCell colSpan={3} className="text-sm">{instrument.details?.remarks}</TableCell>
                                </TableRow>
                            )}
                            {(instrument.generatedPdf || instrument.docketSlip || instrument.cancelPdf) && (
                                <TableRow className="hover:bg-muted/30">
                                    <TableCell className="text-sm font-medium text-muted-foreground">Documents</TableCell>
                                    <TableCell colSpan={3} className="text-sm">
                                        <div className="flex flex-wrap gap-4">
                                            {instrument.generatedPdf && renderFileLink(instrument.generatedPdf, "Generated Document")}
                                            {instrument.docketSlip && renderFileLink(instrument.docketSlip, "Docket Slip")}
                                            {instrument.cancelPdf && renderFileLink(instrument.cancelPdf, "Cancellation PDF")}
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