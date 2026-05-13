import { Table, TableBody, TableRow, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { formatINR } from "@/hooks/useINRFormatter";
import { formatDate } from "@/hooks/useFormatedDate";
import { formatValue, getStatusBadgeVariant, getReadableStatusName, BI_STATUSES } from "../../constants";

interface BgDetails {
    bgNo?: string | null;
    bgDate?: string | Date | null;
    validityDate?: string | Date | null;
    claimExpiryDate?: string | Date | null;
    beneficiaryName?: string | null;
    beneficiaryAddress?: string | null;
    bankName?: string | null;
    bgNeeds?: string | null;
    bgPurpose?: string | null;
    bgSoftCopy?: string | null;
    bgPo?: string | null;
    courierNo?: string | null;
    stampCharge?: string | number | null;
    extensionLetter?: string | null;
    newBgClaim?: string | null;
    extendedAmount?: string | number | null;
    extendedValidityDate?: string | Date | null;
    extendedClaimExpiryDate?: string | Date | null;
    extendedBankName?: string | null;
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
    extraPdfPaths?: string | null;
    extensionRequestPdf?: string | null;
    cancellationRequestPdf?: string | null;
    details?: BgDetails | null;
    utr?: string | null;
    reqNo?: string | null;
    referenceNo?: string | null;
    transferDate?: string | Date | null;
    courierAddress?: string | null;
    courierDeadline?: number | null;
}

interface BankGuaranteeViewProps {
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

export const BankGuaranteeView = ({ instruments }: BankGuaranteeViewProps) => {
    if (!instruments || instruments.length === 0) {
        return (
            <div className="text-sm text-muted-foreground py-4">
                No Bank Guarantee instruments found.
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
                                    Bank Guarantee #{idx + 1}
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
                                <TableCell className="text-sm font-medium text-muted-foreground">Beneficiary/Favouring</TableCell>
                                <TableCell className="text-sm">{formatValue(instrument.favouring)}</TableCell>
                            </TableRow>
                            {hasValue(instrument.details?.bankName) && (
                                <TableRow className="hover:bg-muted/30">
                                    <TableCell className="text-sm font-medium text-muted-foreground">Bank Name</TableCell>
                                    <TableCell colSpan={3} className="text-sm">{instrument.details?.bankName}</TableCell>
                                </TableRow>
                            )}
                            {hasValue(instrument.details?.bgNo) && (
                                <TableRow className="hover:bg-muted/30">
                                    <TableCell className="text-sm font-medium text-muted-foreground">BG Number</TableCell>
                                    <TableCell colSpan={3} className="text-sm">{instrument.details?.bgNo}</TableCell>
                                </TableRow>
                            )}
                            {hasValue(instrument.details?.bgDate) && (
                                <TableRow className="hover:bg-muted/30">
                                    <TableCell className="text-sm font-medium text-muted-foreground">BG Date</TableCell>
                                    <TableCell className="text-sm">{formatDate(instrument.details?.bgDate)}</TableCell>
                                    {hasValue(instrument.details?.validityDate) && (
                                        <>
                                            <TableCell className="text-sm font-medium text-muted-foreground">Validity Date</TableCell>
                                            <TableCell className="text-sm">{formatDate(instrument.details?.validityDate)}</TableCell>
                                        </>
                                    )}
                                </TableRow>
                            )}
                            {hasValue(instrument.claimExpiryDate) && (
                                <TableRow className="hover:bg-muted/30">
                                    <TableCell className="text-sm font-medium text-muted-foreground">Claim Expiry Date</TableCell>
                                    <TableCell className="text-sm">{formatDate(instrument.claimExpiryDate)}</TableCell>
                                    {hasValue(instrument.details?.newBgClaim) && (
                                        <>
                                            <TableCell className="text-sm font-medium text-muted-foreground">New Claim Expiry</TableCell>
                                            <TableCell className="text-sm">{instrument.details?.newBgClaim}</TableCell>
                                        </>
                                    )}
                                </TableRow>
                            )}
                            {hasValue(instrument.details?.bgNeeds) && (
                                <TableRow className="hover:bg-muted/30">
                                    <TableCell className="text-sm font-medium text-muted-foreground">BG Needs</TableCell>
                                    <TableCell colSpan={3} className="text-sm">{instrument.details?.bgNeeds}</TableCell>
                                </TableRow>
                            )}
                            {hasValue(instrument.details?.bgPurpose) && (
                                <TableRow className="hover:bg-muted/30">
                                    <TableCell className="text-sm font-medium text-muted-foreground">BG Purpose</TableCell>
                                    <TableCell colSpan={3} className="text-sm">{instrument.details?.bgPurpose}</TableCell>
                                </TableRow>
                            )}
                            {hasValue(instrument.details?.bgSoftCopy) && (
                                <TableRow className="hover:bg-muted/30">
                                    <TableCell className="text-sm font-medium text-muted-foreground">BG Soft Copy</TableCell>
                                    <TableCell colSpan={3} className="text-sm">{instrument.details?.bgSoftCopy ? renderFileLink(instrument.details?.bgSoftCopy, "View BG Soft Copy") : ""}</TableCell>
                                </TableRow>
                            )}
                            {hasValue(instrument.details?.bgPo) && (
                                <TableRow className="hover:bg-muted/30">
                                    <TableCell className="text-sm font-medium text-muted-foreground">BG PO</TableCell>
                                    <TableCell colSpan={3} className="text-sm">{instrument.details?.bgPo}</TableCell>
                                </TableRow>
                            )}
                            {hasValue(instrument.details?.courierNo) && (
                                <TableRow className="hover:bg-muted/30">
                                    <TableCell className="text-sm font-medium text-muted-foreground">Courier Number</TableCell>
                                    <TableCell colSpan={3} className="text-sm">{instrument.details?.courierNo}</TableCell>
                                </TableRow>
                            )}
                            {hasValue(instrument.details?.stampCharge) && (
                                <TableRow className="hover:bg-muted/30">
                                    <TableCell className="text-sm font-medium text-muted-foreground">Stamp Charge</TableCell>
                                    <TableCell colSpan={3} className="text-sm">{instrument.details?.stampCharge ? formatINR(instrument.details?.stampCharge) : ""}</TableCell>
                                </TableRow>
                            )}
                            {hasValue(instrument.details?.extendedAmount) && (
                                <TableRow className="hover:bg-muted/30">
                                    <TableCell className="text-sm font-medium text-muted-foreground">Extended Amount</TableCell>
                                    <TableCell className="text-sm font-semibold">{instrument.details?.extendedAmount ? formatINR(instrument.details?.extendedAmount) : ""}</TableCell>
                                    {hasValue(instrument.details?.extendedBankName) && (
                                        <>
                                            <TableCell className="text-sm font-medium text-muted-foreground">Extended Bank</TableCell>
                                            <TableCell className="text-sm">{instrument.details?.extendedBankName}</TableCell>
                                        </>
                                    )}
                                </TableRow>
                            )}
                            {hasValue(instrument.details?.extendedValidityDate) && (
                                <TableRow className="hover:bg-muted/30">
                                    <TableCell className="text-sm font-medium text-muted-foreground">Extended Validity</TableCell>
                                    <TableCell className="text-sm">{formatDate(instrument.details?.extendedValidityDate)}</TableCell>
                                    {hasValue(instrument.details?.extendedClaimExpiryDate) && (
                                        <>
                                            <TableCell className="text-sm font-medium text-muted-foreground">Extended Claim Expiry</TableCell>
                                            <TableCell className="text-sm">{formatDate(instrument.details?.extendedClaimExpiryDate)}</TableCell>
                                        </>
                                    )}
                                </TableRow>
                            )}
                            {(instrument.courierAddress || instrument.courierDeadline) && (
                                <TableRow className="hover:bg-muted/30">
                                    <TableCell className="text-sm font-medium text-muted-foreground">Courier Address</TableCell>
                                    <TableCell className="text-sm whitespace-normal" colSpan={instrument.courierDeadline ? 1 : 3}>{formatValue(instrument.courierAddress)}</TableCell>
                                    {instrument.courierDeadline && (
                                        <>
                                            <TableCell className="text-sm font-medium text-muted-foreground">Deadline</TableCell>
                                            <TableCell className="text-sm">{instrument.courierDeadline} days</TableCell>
                                        </>
                                    )}
                                </TableRow>
                            )}
                            {(instrument.generatedPdf || instrument.docketSlip || instrument.cancelPdf || instrument.coveringLetter || instrument.extensionRequestPdf || instrument.cancellationRequestPdf) && (
                                <TableRow className="hover:bg-muted/30">
                                    <TableCell className="text-sm font-medium text-muted-foreground">Documents</TableCell>
                                    <TableCell colSpan={3} className="text-sm">
                                        <div className="flex flex-wrap gap-4">
                                            {instrument.generatedPdf && renderFileLink(instrument.generatedPdf, "Generated BG")}
                                            {instrument.docketSlip && renderFileLink(instrument.docketSlip, "Docket Slip")}
                                            {instrument.cancelPdf && renderFileLink(instrument.cancelPdf, "Cancellation PDF")}
                                            {instrument.coveringLetter && renderFileLink(instrument.coveringLetter, "Covering Letter")}
                                            {instrument.extensionRequestPdf && renderFileLink(instrument.extensionRequestPdf, "Extension Request")}
                                            {instrument.cancellationRequestPdf && renderFileLink(instrument.cancellationRequestPdf, "Cancellation Request")}
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