import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableRow, TableCell } from '@/components/ui/table';
import { Shield, Eye, Loader2, AlertCircle } from 'lucide-react';
import { formatINR } from '@/hooks/useINRFormatter';
import { formatDate } from '@/hooks/useFormatedDate';
import { tenderFilesService } from '@/services/api/tender-files.service';
import { TenderView } from '@/modules/tendering/tenders/components/TenderView';
import { useTender } from '@/hooks/api/useTenders';
import { useInfoSheet } from '@/hooks/api/useInfoSheets';
import { InfoSheetView } from '@/modules/tendering/info-sheet/components/InfoSheetView';
import { Alert, AlertDescription } from '@/components/ui/alert';

const FileLink = ({ file }: { file?: string }) => {
    if (!file) return <span className="text-muted-foreground">Not Uploaded</span>;

    const getFileUrl = (filePath: string) => {
        const fileName = filePath.split('/').pop() || '';

        // If file ends with _soft_copy.pdf
        if (filePath.endsWith('_soft_copy.pdf')) {
            return `/uploads/courier/${fileName}`;
        }

        // If file name (without extension) ends with _te_
        const nameParts = fileName.split('.');
        const nameWithoutExt = nameParts.length > 1 ? nameParts.slice(0, -1).join('.') : fileName;
        if (nameWithoutExt.endsWith('_te_')) {
            return `/uploads/tendering/bg-po-files/${fileName}`;
        }

        return tenderFilesService.getFileUrl(filePath);
    };

    return (
        <div className="flex gap-3 items-center">
            <a
                href={getFileUrl(file)}
                target="_blank"
                className="flex items-center gap-1 text-blue-600 hover:underline"
            >
                <Eye className="h-4 w-4" />
                {file?.split('_').slice(1).join('_')}
            </a>
        </div>
    );
};

const SectionHeader = ({ title }: { title: string }) => (
    <TableRow className="bg-muted/50">
        <TableCell colSpan={4} className="font-semibold text-sm">
            {title}
        </TableCell>
    </TableRow>
);

const DataRow = ({ label1, value1, label2, value2 }: {
    label1: string;
    value1: React.ReactNode;
    label2?: string;
    value2?: React.ReactNode;
}) => (
    <TableRow className="hover:bg-muted/30 transition-colors">
        <TableCell className="text-sm font-medium text-muted-foreground w-1/4">
            {label1}
        </TableCell>
        <TableCell className="text-sm w-1/4 whitespace-normal [overflow-wrap:anywhere]">
            {value1}
        </TableCell>
        {label2 ? (
            <>
                <TableCell className="text-sm font-medium text-muted-foreground w-1/4">
                    {label2}
                </TableCell>
                <TableCell className="text-sm w-1/4 whitespace-normal [overflow-wrap:anywhere]">
                    {value2}
                </TableCell>
            </>
        ) : (
            <TableCell colSpan={2} />
        )}
    </TableRow>
);

interface BankGuaranteeViewProps {
    data: any;
    isLoading?: boolean;
    className?: string;
}

export function BankGuaranteeView({
    data,
    isLoading = false,
    className = '',
}: BankGuaranteeViewProps) {
    if (isLoading) {
        return (
            <Card className={className}>
                <CardHeader>
                    <Skeleton className="h-8 w-48" />
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        {Array.from({ length: 8 }).map((_, i) => (
                            <Skeleton key={i} className="h-12 w-full" />
                        ))}
                    </div>
                </CardContent>
            </Card>
        );
    }

    if (!data) {
        return null;
    }

    const calculateBgClaimPeriod = (
        expiryDate: Date | null,
        claimExpiryDate: Date | null
    ): number | null => {
        if (!expiryDate || !claimExpiryDate) return null;
        const diffTime = claimExpiryDate.getTime() - expiryDate.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays;
    };

    const bgClaimPeriod =
        data.bgExpiryDate && data.claimExpiryDateBg
            ? calculateBgClaimPeriod(
                new Date(data.bgExpiryDate),
                new Date(data.claimExpiryDateBg)
            )
            : null;

    // Check if sections have data
    const hasFdrDetails = data.fdrNo || data.fdrAmt || data.fdrCopy || data.fdrCancellationDate;
    const hasBankInfo = data.bankName || data.bgBankAcc || data.bgBankIfsc;
    const hasExtensionDetails = data.extendedAmount || data.extendedValidityDate;
    const hasCourierInfo =
        data.bgCourierAddress ||
        data.courierRequestNo ||
        data.courierDocketNo ||
        data.courierNo ||
        data.courierAddress;
    const hasReturnInfo =
        data.returnCourierDocketNo ||
        data.returnCourierSlip ||
        data.bgCancellationConfirmation ||
        data.bankReferenceNo;

    // If Tender Id exist
    const tenderId = Number.isNaN(data.tenderId) ? null : data.tenderId;
    const { data: tender, isLoading: isTenderLoading } = useTender(tenderId);
    const { data: infoSheet, isLoading: infoSheetLoading, error: infoSheetError } = useInfoSheet(tenderId);

    return (
        <>
            <Card className={className}>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Shield className="h-5 w-5" />
                        Bank Guarantee Details
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableBody>
                            {/* Section 1: Basic Information */}
                            <SectionHeader title="Basic Information" />
                            <DataRow
                                label1="BG No"
                                value1={<span className="font-semibold">{data.bgNo || '—'}</span>}
                                label2="BG Date"
                                value2={data.bgDate ? formatDate(data.bgDate) : '—'}
                            />
                            <DataRow
                                label1="Amount"
                                value1={
                                    <span className="font-semibold">
                                        {data.amount ? formatINR(Number(data.amount)) : '—'}
                                    </span>
                                }
                                label2="Status"
                                value2={<Badge variant="outline">{data.status || '—'}</Badge>}
                            />
                            <DataRow
                                label1="Purpose"
                                value1={data.bgPurpose || data.purpose || '—'}
                                label2="Beneficiary Name"
                                value2={data.beneficiaryName || '—'}
                            />

                            {/* Section 2: Request Information */}
                            <SectionHeader title="Request Information" />
                            <DataRow
                                label1="Request ID"
                                value1={data.requestId ?? '—'}
                                label2="Request Type"
                                value2={data.requestType || '—'}
                            />
                            <DataRow
                                label1="Requested By"
                                value1={data.requestedByName || '—'}
                                label2="Rejection Reasons"
                                value2={data.rejectionReasons || '—'}
                            />
                            <DataRow
                                label1="Prefilled Forms (Unsigned)"
                                value1={<FileLink file={data.prefilledFormsUnsigned} />}
                                label2="Prefilled Forms (Signed)"
                                value2={<FileLink file={data.prefilledFormsSigned} />}
                            />
                            <DataRow
                                label1="BG Format by TE"
                                value1={<FileLink file={data.bgFormatTe} />}
                                label2="BG Format by Accounts"
                                value2={<FileLink file={data.bgFormatAccounts} />}
                            />
                            <DataRow
                                label1="PO / Request Letter / Tender Name"
                                value1={<FileLink file={data.poRequestLetter} />}
                            />

                            {/* Section 3: Tender/Project Information */}
                            <SectionHeader title="Tender/Project Information" />
                            <DataRow
                                label1="Tender No"
                                value1={data.tenderNo || data.projectNo || '—'}
                                label2="Tender Name"
                                value2={data.tenderName || data.projectName || '—'}
                            />
                            <DataRow
                                label1="Bid Validity"
                                value1={
                                    data.tenderDueDate
                                        ? formatDate(data.tenderDueDate)
                                        : data.requestDueDate
                                            ? formatDate(data.requestDueDate)
                                            : '—'
                                }
                                label2="Tender Status"
                                value2={data.tenderStatusName || '—'}
                            />

                            {/* Section 4: Beneficiary & Client Information */}
                            <SectionHeader title="Beneficiary & Client Information" />
                            <DataRow
                                label1="Beneficiary Address"
                                value1={data.beneficiaryAddress || '—'}
                                label2="Client Emails"
                                value2={data.clientEmails?.join(', ') || '—'}
                            />
                            <DataRow
                                label1="Client Bank Account Name"
                                value1={data.clientBankAccName || '—'}
                                label2="Client Account No"
                                value2={data.clientAccNo || '—'}
                            />
                            <DataRow
                                label1="Client Bank IFSC"
                                value1={data.ifsc || '—'}
                            />

                            {/* Section 5: BG Validity & Dates */}
                            <SectionHeader title="BG Validity & Dates" />
                            <DataRow
                                label1="Validity Date"
                                value1={data.validityDate ? formatDate(data.validityDate) : '—'}
                                label2="Expiry Date"
                                value2={data.bgExpiryDate ? formatDate(data.bgExpiryDate) : '—'}
                            />
                            <DataRow
                                label1="Claim Expiry Date"
                                value1={data.claimExpiryDateBg ? formatDate(data.claimExpiryDateBg) : '—'}
                                label2="BG Claim Period"
                                value2={bgClaimPeriod !== null ? `${bgClaimPeriod} days` : '—'}
                            />
                            <DataRow
                                label1="Soft Copy of BG"
                                value1={<FileLink file={data.bgSoftCopy} />}
                                label2="SFMS File"
                                value2={<FileLink file={data.sfmsFile} />}
                            />

                            {/* Section 6: BG Issuing Bank Information */}
                            {hasBankInfo && (
                                <>
                                    <SectionHeader title="BG Issuing Bank Information" />
                                    <DataRow
                                        label1="Bank Name"
                                        value1={data.bankName || '—'}
                                        label2="Bank Account"
                                        value2={data.bgBankAcc || '—'}
                                    />
                                    <DataRow
                                        label1="Bank IFSC"
                                        value1={data.bgBankIfsc || '—'}
                                    />
                                </>
                            )}

                            {/* Section 7: Charges */}
                            <SectionHeader title="Charges" />
                            <DataRow
                                label1="BG Charges Paid"
                                value1={
                                    <span className="font-semibold">
                                        {data.bgChargeDeducted
                                            ? formatINR(Number(data.bgChargeDeducted))
                                            : '—'}
                                    </span>
                                }
                                label2="Stamp Charges"
                                value2={
                                    data.stampChargesDeducted
                                        ? formatINR(Number(data.stampChargesDeducted))
                                        : '—'
                                }
                            />
                            <DataRow
                                label1="SFMS Charges"
                                value1={
                                    data.sfmsChargesDeducted
                                        ? formatINR(Number(data.sfmsChargesDeducted))
                                        : '—'
                                }
                                label2="Other Charges"
                                value2={
                                    data.otherChargesDeducted
                                        ? formatINR(Number(data.otherChargesDeducted))
                                        : '—'
                                }
                            />

                            {/* Section 8: FDR Details */}
                            {hasFdrDetails && (
                                <>
                                    <SectionHeader title="FDR Details" />
                                    <DataRow
                                        label1="FDR No"
                                        value1={data.fdrNo || '—'}
                                        label2="FDR Amount"
                                        value2={
                                            <span className="font-semibold">
                                                {data.fdrAmt ? formatINR(Number(data.fdrAmt)) : '—'}
                                            </span>
                                        }
                                    />
                                    <DataRow
                                        label1="FDR Validity"
                                        value1={data.fdrValidity ? formatDate(data.fdrValidity) : '—'}
                                        label2="FDR ROI"
                                        value2={data.fdrRoi ? `${Number(data.fdrRoi)}%` : '—'}
                                    />
                                    <DataRow
                                        label1="FDR Copy"
                                        value1={<FileLink file={data.fdrCopy} />}
                                        label2="FDR Cancellation Date"
                                        value2={
                                            data.fdrCancellationDate
                                                ? formatDate(data.fdrCancellationDate)
                                                : '—'
                                        }
                                    />
                                    <DataRow
                                        label1="Cancelled FDR Amount"
                                        value1={
                                            data.cancelledFdrAmount
                                                ? formatINR(Number(data.cancelledFdrAmount))
                                                : '—'
                                        }
                                    />
                                </>
                            )}

                            {/* Section 9: Courier & Dispatch Information */}
                            {hasCourierInfo && (
                                <>
                                    <SectionHeader title="Courier & Dispatch Information" />
                                    <DataRow
                                        label1="BG Courier Address"
                                        value1={data.bgCourierAddress || data.courierAddress || '—'}
                                        label2="Courier Request No"
                                        value2={data.courierRequestNo || '—'}
                                    />
                                    <DataRow
                                        label1="Courier Docket No"
                                        value1={data.courierDocketNo || data.courierNo || '—'}
                                        label2="Courier Docket Slip"
                                        value2={<FileLink file={data.courierDocketSlip} />}
                                    />
                                </>
                            )}

                            {/* Section 10: BG Return & Cancellation */}
                            {hasReturnInfo && (
                                <>
                                    <SectionHeader title="BG Return & Cancellation" />
                                    <DataRow
                                        label1="Return Courier Docket No"
                                        value1={data.returnCourierDocketNo || '—'}
                                        label2="Return Courier Slip"
                                        value2={<FileLink file={data.returnCourierSlip} />}
                                    />
                                    <DataRow
                                        label1="BG Cancellation Confirmation"
                                        value1={<FileLink file={data.bgCancellationConfirmation} />}
                                        label2="Bank Reference No"
                                        value2={data.bankReferenceNo || '—'}
                                    />
                                    <DataRow
                                        label1="Followup Proof"
                                        value1={<FileLink file={data.followupProof} />}
                                        label2="Followup Proof Image"
                                        value2={<FileLink file={data.followupProofImage} />}
                                    />
                                </>
                            )}

                            {/* Section 11: Extension Details */}
                            {hasExtensionDetails && (
                                <>
                                    <SectionHeader title="Extension Details" />
                                    <DataRow
                                        label1="Extended Amount"
                                        value1={
                                            <span className="font-semibold">
                                                {data.extendedAmount
                                                    ? formatINR(Number(data.extendedAmount))
                                                    : '—'}
                                            </span>
                                        }
                                        label2="Extended Validity Date"
                                        value2={
                                            data.extendedValidityDate
                                                ? formatDate(data.extendedValidityDate)
                                                : '—'
                                        }
                                    />
                                    <DataRow
                                        label1="Extended Claim Expiry Date"
                                        value1={
                                            data.extendedClaimExpiryDate
                                                ? formatDate(data.extendedClaimExpiryDate)
                                                : '—'
                                        }
                                        label2="Extended Bank Name"
                                        value2={data.extendedBankName || '—'}
                                    />
                                </>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
            <div className='space-y-5'>
                {isTenderLoading ? (
                    <div className="flex items-center justify-center py-8">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                ) : tender ? (
                    <TenderView tender={tender} />
                ) : (
                    <div className="text-center py-8 text-muted-foreground">
                        No tender details found
                    </div>
                )}
                {infoSheetLoading ? (
                    <div className="flex items-center justify-center py-8">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                ) : infoSheetError ? (
                    <Alert variant="destructive" className="mb-4">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                            Failed to load info sheet details
                        </AlertDescription>
                    </Alert>
                ) : infoSheet ? (
                    <InfoSheetView infoSheet={infoSheet} />
                ) : (
                    <div className="text-center py-8 text-muted-foreground">
                        No info sheet details found
                    </div>
                )}
            </div>
        </>
    );
}
