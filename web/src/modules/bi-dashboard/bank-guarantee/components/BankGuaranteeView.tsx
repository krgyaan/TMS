import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableRow, TableCell } from '@/components/ui/table';
import { Shield } from 'lucide-react';
import { formatINR } from '@/hooks/useINRFormatter';
import { formatDate, formatDateTime } from '@/hooks/useFormatedDate';

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

    const calculateBgClaimPeriod = (expiryDate: Date | null, claimExpiryDate: Date | null): number | null => {
        if (!expiryDate || !claimExpiryDate) return null;
        const diffTime = claimExpiryDate.getTime() - expiryDate.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays;
    };

    const bgClaimPeriod = data.bgExpiryDate && data.claimExpiryDateBg
        ? calculateBgClaimPeriod(new Date(data.bgExpiryDate), new Date(data.claimExpiryDateBg))
        : null;

    return (
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
                        {/* Basic Information */}
                        <TableRow className="bg-muted/50">
                            <TableCell colSpan={4} className="font-semibold text-sm">
                                Basic Information
                            </TableCell>
                        </TableRow>
                        <TableRow className="hover:bg-muted/30 transition-colors">
                            <TableCell className="text-sm font-medium text-muted-foreground w-1/4">
                                BG No
                            </TableCell>
                            <TableCell className="text-sm font-semibold w-1/4">
                                {data.bgNo || '—'}
                            </TableCell>
                            <TableCell className="text-sm font-medium text-muted-foreground w-1/4">
                                BG Date
                            </TableCell>
                            <TableCell className="text-sm w-1/4">
                                {data.bgDate ? formatDate(data.bgDate) : '—'}
                            </TableCell>
                        </TableRow>
                        <TableRow className="hover:bg-muted/30 transition-colors">
                            <TableCell className="text-sm font-medium text-muted-foreground">
                                Beneficiary Name
                            </TableCell>
                            <TableCell className="text-sm">
                                {data.beneficiaryName || '—'}
                            </TableCell>
                            <TableCell className="text-sm font-medium text-muted-foreground">
                                Amount
                            </TableCell>
                            <TableCell className="text-sm font-semibold">
                                {data.amount ? formatINR(Number(data.amount)) : '—'}
                            </TableCell>
                        </TableRow>
                        <TableRow className="hover:bg-muted/30 transition-colors">
                            <TableCell className="text-sm font-medium text-muted-foreground">
                                Status
                            </TableCell>
                            <TableCell className="text-sm">
                                <Badge variant="outline">{data.status || '—'}</Badge>
                            </TableCell>
                            <TableCell className="text-sm font-medium text-muted-foreground">
                                Purpose
                            </TableCell>
                            <TableCell className="text-sm">
                                {data.purpose || '—'}
                            </TableCell>
                        </TableRow>

                        {/* Tender/Project Information */}
                        <TableRow className="bg-muted/50">
                            <TableCell colSpan={4} className="font-semibold text-sm">
                                Tender/Project Information
                            </TableCell>
                        </TableRow>
                        <TableRow className="hover:bg-muted/30 transition-colors">
                            <TableCell className="text-sm font-medium text-muted-foreground">
                                Tender No
                            </TableCell>
                            <TableCell className="text-sm">
                                {data.tenderNo || data.projectNo || '—'}
                            </TableCell>
                            <TableCell className="text-sm font-medium text-muted-foreground">
                                Tender Name
                            </TableCell>
                            <TableCell className="text-sm">
                                {data.tenderName || data.projectName || '—'}
                            </TableCell>
                        </TableRow>
                        <TableRow className="hover:bg-muted/30 transition-colors">
                            <TableCell className="text-sm font-medium text-muted-foreground">
                                Bid Validity
                            </TableCell>
                            <TableCell className="text-sm">
                                {data.tenderDueDate ? formatDate(data.tenderDueDate) : data.requestDueDate ? formatDate(data.requestDueDate) : '—'}
                            </TableCell>
                            <TableCell className="text-sm font-medium text-muted-foreground">
                                Tender Status
                            </TableCell>
                            <TableCell className="text-sm">
                                {data.tenderStatusName || '—'}
                            </TableCell>
                        </TableRow>

                        {/* BG Details */}
                        <TableRow className="bg-muted/50">
                            <TableCell colSpan={4} className="font-semibold text-sm">
                                BG Details
                            </TableCell>
                        </TableRow>
                        <TableRow className="hover:bg-muted/30 transition-colors">
                            <TableCell className="text-sm font-medium text-muted-foreground">
                                Expiry Date
                            </TableCell>
                            <TableCell className="text-sm">
                                {data.bgExpiryDate ? formatDate(data.bgExpiryDate) : '—'}
                            </TableCell>
                            <TableCell className="text-sm font-medium text-muted-foreground">
                                Claim Expiry Date
                            </TableCell>
                            <TableCell className="text-sm">
                                {data.claimExpiryDateBg ? formatDate(data.claimExpiryDateBg) : '—'}
                            </TableCell>
                        </TableRow>
                        <TableRow className="hover:bg-muted/30 transition-colors">
                            <TableCell className="text-sm font-medium text-muted-foreground">
                                Validity Date
                            </TableCell>
                            <TableCell className="text-sm">
                                {data.validityDate ? formatDate(data.validityDate) : '—'}
                            </TableCell>
                            <TableCell className="text-sm font-medium text-muted-foreground">
                                BG Claim Period
                            </TableCell>
                            <TableCell className="text-sm">
                                {bgClaimPeriod !== null ? `${bgClaimPeriod} days` : '—'}
                            </TableCell>
                        </TableRow>

                        {/* Charges */}
                        <TableRow className="bg-muted/50">
                            <TableCell colSpan={4} className="font-semibold text-sm">
                                Charges
                            </TableCell>
                        </TableRow>
                        <TableRow className="hover:bg-muted/30 transition-colors">
                            <TableCell className="text-sm font-medium text-muted-foreground">
                                BG Charges Paid
                            </TableCell>
                            <TableCell className="text-sm font-semibold">
                                {data.bgChargeDeducted ? formatINR(Number(data.bgChargeDeducted)) : '—'}
                            </TableCell>
                            <TableCell className="text-sm font-medium text-muted-foreground">
                                Stamp Charges
                            </TableCell>
                            <TableCell className="text-sm">
                                {data.stampChargesDeducted ? formatINR(Number(data.stampChargesDeducted)) : '—'}
                            </TableCell>
                        </TableRow>
                        <TableRow className="hover:bg-muted/30 transition-colors">
                            <TableCell className="text-sm font-medium text-muted-foreground">
                                SFMS Charges
                            </TableCell>
                            <TableCell className="text-sm">
                                {data.sfmsChargesDeducted ? formatINR(Number(data.sfmsChargesDeducted)) : '—'}
                            </TableCell>
                            <TableCell className="text-sm font-medium text-muted-foreground">
                                Other Charges
                            </TableCell>
                            <TableCell className="text-sm">
                                {data.otherChargesDeducted ? formatINR(Number(data.otherChargesDeducted)) : '—'}
                            </TableCell>
                        </TableRow>

                        {/* FDR Details */}
                        {(data.fdrNo || data.fdrAmt) && (
                            <>
                                <TableRow className="bg-muted/50">
                                    <TableCell colSpan={4} className="font-semibold text-sm">
                                        FDR Details
                                    </TableCell>
                                </TableRow>
                                <TableRow className="hover:bg-muted/30 transition-colors">
                                    <TableCell className="text-sm font-medium text-muted-foreground">
                                        FDR No
                                    </TableCell>
                                    <TableCell className="text-sm">
                                        {data.fdrNo || '—'}
                                    </TableCell>
                                    <TableCell className="text-sm font-medium text-muted-foreground">
                                        FDR Value
                                    </TableCell>
                                    <TableCell className="text-sm font-semibold">
                                        {data.fdrAmt ? formatINR(Number(data.fdrAmt)) : '—'}
                                    </TableCell>
                                </TableRow>
                                <TableRow className="hover:bg-muted/30 transition-colors">
                                    <TableCell className="text-sm font-medium text-muted-foreground">
                                        FDR Validity
                                    </TableCell>
                                    <TableCell className="text-sm">
                                        {data.fdrValidity ? formatDate(data.fdrValidity) : '—'}
                                    </TableCell>
                                    <TableCell className="text-sm font-medium text-muted-foreground">
                                        FDR ROI
                                    </TableCell>
                                    <TableCell className="text-sm">
                                        {data.fdrRoi ? `${Number(data.fdrRoi)}%` : '—'}
                                    </TableCell>
                                </TableRow>
                            </>
                        )}

                        {/* Bank Information */}
                        {data.bankName && (
                            <>
                                <TableRow className="bg-muted/50">
                                    <TableCell colSpan={4} className="font-semibold text-sm">
                                        Bank Information
                                    </TableCell>
                                </TableRow>
                                <TableRow className="hover:bg-muted/30 transition-colors">
                                    <TableCell className="text-sm font-medium text-muted-foreground">
                                        Bank Name
                                    </TableCell>
                                    <TableCell className="text-sm">
                                        {data.bankName || '—'}
                                    </TableCell>
                                    <TableCell className="text-sm font-medium text-muted-foreground">
                                        Bank Account
                                    </TableCell>
                                    <TableCell className="text-sm">
                                        {data.bgBankAcc || '—'}
                                    </TableCell>
                                </TableRow>
                                <TableRow className="hover:bg-muted/30 transition-colors">
                                    <TableCell className="text-sm font-medium text-muted-foreground">
                                        Bank IFSC
                                    </TableCell>
                                    <TableCell className="text-sm">
                                        {data.bgBankIfsc || '—'}
                                    </TableCell>
                                    <TableCell className="text-sm font-medium text-muted-foreground">
                                        Beneficiary Address
                                    </TableCell>
                                    <TableCell className="text-sm">
                                        {data.beneficiaryAddress || '—'}
                                    </TableCell>
                                </TableRow>
                            </>
                        )}

                        {/* Extension Details */}
                        {(data.extendedAmount || data.extendedValidityDate) && (
                            <>
                                <TableRow className="bg-muted/50">
                                    <TableCell colSpan={4} className="font-semibold text-sm">
                                        Extension Details
                                    </TableCell>
                                </TableRow>
                                <TableRow className="hover:bg-muted/30 transition-colors">
                                    <TableCell className="text-sm font-medium text-muted-foreground">
                                        Extended Amount
                                    </TableCell>
                                    <TableCell className="text-sm font-semibold">
                                        {data.extendedAmount ? formatINR(Number(data.extendedAmount)) : '—'}
                                    </TableCell>
                                    <TableCell className="text-sm font-medium text-muted-foreground">
                                        Extended Validity Date
                                    </TableCell>
                                    <TableCell className="text-sm">
                                        {data.extendedValidityDate ? formatDate(data.extendedValidityDate) : '—'}
                                    </TableCell>
                                </TableRow>
                                <TableRow className="hover:bg-muted/30 transition-colors">
                                    <TableCell className="text-sm font-medium text-muted-foreground">
                                        Extended Claim Expiry Date
                                    </TableCell>
                                    <TableCell className="text-sm">
                                        {data.extendedClaimExpiryDate ? formatDate(data.extendedClaimExpiryDate) : '—'}
                                    </TableCell>
                                    <TableCell className="text-sm font-medium text-muted-foreground">
                                        Extended Bank Name
                                    </TableCell>
                                    <TableCell className="text-sm">
                                        {data.extendedBankName || '—'}
                                    </TableCell>
                                </TableRow>
                            </>
                        )}

                        {/* Courier Information */}
                        {data.courierNo && (
                            <>
                                <TableRow className="bg-muted/50">
                                    <TableCell colSpan={4} className="font-semibold text-sm">
                                        Courier Information
                                    </TableCell>
                                </TableRow>
                                <TableRow className="hover:bg-muted/30 transition-colors">
                                    <TableCell className="text-sm font-medium text-muted-foreground">
                                        Courier No
                                    </TableCell>
                                    <TableCell className="text-sm">
                                        {data.courierNo || '—'}
                                    </TableCell>
                                    <TableCell className="text-sm font-medium text-muted-foreground">
                                        Courier Address
                                    </TableCell>
                                    <TableCell className="text-sm">
                                        {data.courierAddress || '—'}
                                    </TableCell>
                                </TableRow>
                            </>
                        )}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}
