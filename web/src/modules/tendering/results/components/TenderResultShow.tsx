import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableRow, TableCell } from '@/components/ui/table';
import { Trophy, XCircle, Clock, Gavel, CheckCircle2, FileText, ExternalLink, Download } from 'lucide-react';
import { formatINR } from '@/hooks/useINRFormatter';
import { formatDateTime } from '@/hooks/useFormatedDate';
import type { ResultDashboardRow } from '../helpers/tenderResult.types';
import { Button } from '@/components/ui/button';

import { useTenderResultByTenderId } from '@/hooks/api/useTenderResults';
import { usePaymentRequestsByTender } from '@/hooks/api/useEmds';
import { useTender } from '@/hooks/api/useTenders';
import { useBidSubmissionByTender } from '@/hooks/api/useBidSubmissions';
import { useMemo } from 'react';
import { tenderFilesService } from '@/services/api/tender-files.service';

interface TenderResultShowProps {
    result: ResultDashboardRow & {
        disqualificationReason?: string | null;
        qualifiedPartiesCount?: string | null;
        qualifiedPartiesNames?: string[] | null;
        result?: string | null;
        l1Price?: string | null;
        l2Price?: string | null;
        ourPrice?: string | null;
        qualifiedPartiesScreenshot?: string | null;
        finalResultScreenshot?: string | null;
        reverseAuctionId?: number | null;
        resultReason?: string | null;
        // Derived fields
        bidSubmissionDate?: string | Date | null;
        finalPrice?: string | null;
        resultStatus?: string;
        emdDetails?: {
            amount: string;
            instrumentType: string | null;
            instrumentStatus: string | null;
            displayText: string;
        } | null;
    };
    isLoading?: boolean;
    onViewRa?: (raId: number) => void;
    className?: string;
}

// Helper function to get file URL from stored path
const getFileUrl = (filePath: string): string => {
    // File paths are stored as "context/filename.ext" (e.g., "bid-submitted-docs/file.pdf")
    // API expects: /tender-files/serve/:context/:fileName
    const parts = filePath.split('/');
    if (parts.length >= 2) {
        const context = parts[0];
        const fileName = parts.slice(1).join('/');
        // Get base URL from axios instance
        const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1';
        return `${baseUrl}/tender-files/serve/${context}/${encodeURIComponent(fileName)}`;
    }
    return tenderFilesService.getFileUrl(filePath);
};

const getStatusVariant = (status: string): string => {
    switch (status) {
        case 'Result Awaited':
        case 'Under Evaluation':
            return 'secondary';
        case 'Won':
            return 'success';
        case 'Lost':
        case 'Lost - H1 Elimination':
        case 'Disqualified':
            return 'destructive';
        default:
            return 'secondary';
    }
};

const getEmdStatusVariant = (status: string | null): string => {
    if (!status) return 'secondary';
    const upperStatus = status.toUpperCase();

    if (upperStatus.includes('REJECTED')) return 'destructive';
    if (upperStatus.includes('APPROVED') || upperStatus.includes('COMPLETED')) return 'success';
    if (upperStatus.includes('SUBMITTED') || upperStatus.includes('INITIATED')) return 'info';
    if (upperStatus.includes('PENDING')) return 'warning';
    return 'secondary';
};
export function TenderResultShow({
    result,
    isLoading = false,
    onViewRa,
    className = '',
}: TenderResultShowProps) {
    if (isLoading) {
        return (
            <Card className={className}>
                <CardHeader className="pb-3">
                    <Skeleton className="h-5 w-40" />
                </CardHeader>
                <CardContent className="pt-0">
                    <div className="space-y-2">
                        {Array.from({ length: 4 }).map((_, i) => (
                            <Skeleton key={i} className="h-10 w-full" />
                        ))}
                    </div>
                </CardContent>
            </Card>
        );
    }

    if (!result) {
        return (
            <Card className={className}>
                <CardContent className="p-8">
                    <div className="flex items-center justify-center text-muted-foreground">
                        No Tender Result data found.
                    </div>
                </CardContent>
            </Card>
        );
    }

    const isQualified = result?.technicallyQualified === 'Yes';
    const isDisqualified = result?.technicallyQualified === 'No';
    const hasResult = !!result.result;

    return (
        <Card className={className}>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Trophy className="h-5 w-5" />
                    Tender Result Details
                </CardTitle>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableBody>
                        {/* Tender Information */}
                        <TableRow className="bg-muted/50">
                            <TableCell colSpan={4} className="font-semibold text-sm">
                                Tender Information
                            </TableCell>
                        </TableRow>
                        <TableRow className="hover:bg-muted/30 transition-colors">
                            <TableCell className="text-sm font-medium text-muted-foreground w-1/4">
                                Tender No
                            </TableCell>
                            <TableCell className="text-sm font-semibold w-1/4">
                                {result.tenderNo || '—'}
                            </TableCell>
                            <TableCell className="text-sm font-medium text-muted-foreground w-1/4">
                                Tender Name
                            </TableCell>
                            <TableCell className="text-sm w-1/4">
                                {result.tenderName || '—'}
                            </TableCell>
                        </TableRow>
                        <TableRow className="hover:bg-muted/30 transition-colors">
                            <TableCell className="text-sm font-medium text-muted-foreground">
                                Team Executive
                            </TableCell>
                            <TableCell className="text-sm">
                                {result.teamExecutiveName || '—'}
                            </TableCell>
                            <TableCell className="text-sm font-medium text-muted-foreground">
                                Item
                            </TableCell>
                            <TableCell className="text-sm">
                                {result.itemName || '—'}
                            </TableCell>
                        </TableRow>
                        <TableRow className="hover:bg-muted/30 transition-colors">
                            <TableCell className="text-sm font-medium text-muted-foreground">
                                Bid Submission Date
                            </TableCell>
                            <TableCell className="text-sm">
                                {result.bidSubmissionDate ? formatDateTime(result.bidSubmissionDate) : '—'}
                            </TableCell>
                            <TableCell className="text-sm font-medium text-muted-foreground">
                                Tender Status
                            </TableCell>
                            <TableCell className="text-sm">
                                {result.tenderStatus || '—'}
                            </TableCell>
                        </TableRow>
                        <TableRow className="hover:bg-muted/30 transition-colors">
                            <TableCell className="text-sm font-medium text-muted-foreground">
                                Tender Value
                            </TableCell>
                            <TableCell className="text-sm font-semibold">
                                {result.tenderValue ? formatINR(parseFloat(result.tenderValue)) : '—'}
                            </TableCell>
                            <TableCell className="text-sm font-medium text-muted-foreground">
                                Final Price
                            </TableCell>
                            <TableCell className="text-sm font-semibold">
                                {result.finalPrice ? formatINR(parseFloat(result.finalPrice)) : '—'}
                            </TableCell>
                        </TableRow>
                        <TableRow className="hover:bg-muted/30 transition-colors">
                            <TableCell className="text-sm font-medium text-muted-foreground">
                                Result Status
                            </TableCell>
                            <TableCell colSpan={3}>
                                <Badge variant={getStatusVariant(result.resultStatus || '') as any}>
                                    {result.resultStatus || '—'}
                                </Badge>
                            </TableCell>
                        </TableRow>

                        {/* RA Information */}
                        {result.raApplicable && (
                            <>
                                <TableRow className="bg-muted/50">
                                    <TableCell colSpan={4} className="font-semibold text-sm">
                                        Reverse Auction Information
                                    </TableCell>
                                </TableRow>
                                <TableRow className="hover:bg-muted/30 transition-colors">
                                    <TableCell className="text-sm font-medium text-muted-foreground">
                                        RA Applicable
                                    </TableCell>
                                    <TableCell colSpan={3}>
                                        <Badge variant="outline" className="gap-1">
                                            <Gavel className="h-3 w-3" />
                                            Yes
                                        </Badge>
                                        {result.reverseAuctionId && onViewRa && (
                                            <Button
                                                variant="link"
                                                size="sm"
                                                className="ml-2"
                                                onClick={() => onViewRa(result.reverseAuctionId!)}
                                            >
                                                View RA Details
                                            </Button>
                                        )}
                                    </TableCell>
                                </TableRow>
                            </>
                        )}

                        {/* EMD Details */}
                        {result.emdDetails && (
                            <>
                                <TableRow className="bg-muted/50">
                                    <TableCell colSpan={4} className="font-semibold text-sm">
                                        EMD Details
                                    </TableCell>
                                </TableRow>
                                <TableRow className="hover:bg-muted/30 transition-colors">
                                    <TableCell className="text-sm font-medium text-muted-foreground">
                                        EMD Amount
                                    </TableCell>
                                    <TableCell className="text-sm font-semibold">
                                        {result.emdDetails.displayText === 'Not Applicable' ? (
                                            <span className="text-muted-foreground">N/A</span>
                                        ) : (
                                            formatINR(parseFloat(result.emdDetails.amount))
                                        )}
                                    </TableCell>
                                    <TableCell className="text-sm font-medium text-muted-foreground">
                                        EMD Status
                                    </TableCell>
                                    <TableCell>
                                        {result.emdDetails.displayText !== 'Not Applicable' &&
                                            result.emdDetails.displayText !== 'Not Requested' && (
                                                <Badge
                                                    variant={
                                                        getEmdStatusVariant(
                                                            result.emdDetails.instrumentStatus
                                                        ) as any
                                                    }
                                                >
                                                    {result.emdDetails.displayText}
                                                </Badge>
                                            )}
                                        {result.emdDetails.displayText === 'Not Requested' && (
                                            <Badge variant="outline">Not Requested</Badge>
                                        )}
                                    </TableCell>
                                </TableRow>
                                {result.emdDetails.instrumentType && (
                                    <TableRow className="hover:bg-muted/30 transition-colors">
                                        <TableCell className="text-sm font-medium text-muted-foreground">
                                            Instrument Type
                                        </TableCell>
                                        <TableCell className="text-sm" colSpan={3}>
                                            {result.emdDetails.instrumentType}
                                        </TableCell>
                                    </TableRow>
                                )}
                            </>
                        )}

                        {/* Technical Qualification (for non-RA tenders) */}
                        {!result.raApplicable && (
                            <>
                                <TableRow className="bg-muted/50">
                                    <TableCell colSpan={4} className="font-semibold text-sm">
                                        Technical Qualification
                                    </TableCell>
                                </TableRow>
                                <TableRow className="hover:bg-muted/30 transition-colors">
                                    <TableCell className="text-sm font-medium text-muted-foreground">
                                        Technically Qualified
                                    </TableCell>
                                    <TableCell colSpan={3}>
                                        {isQualified ? (
                                            <Badge variant="success" className="gap-1">
                                                <CheckCircle2 className="h-3 w-3" />
                                                Yes
                                            </Badge>
                                        ) : isDisqualified ? (
                                            <Badge variant="destructive" className="gap-1">
                                                <XCircle className="h-3 w-3" />
                                                No
                                            </Badge>
                                        ) : (
                                            <Badge variant="secondary" className="gap-1">
                                                <Clock className="h-3 w-3" />
                                                Under Evaluation
                                            </Badge>
                                        )}
                                    </TableCell>
                                </TableRow>
                                {isDisqualified && result.disqualificationReason && (
                                    <TableRow className="hover:bg-muted/30 transition-colors">
                                        <TableCell className="text-sm font-medium text-muted-foreground">
                                            Disqualification Reason
                                        </TableCell>
                                        <TableCell className="text-sm break-words" colSpan={3}>
                                            {result.disqualificationReason}
                                        </TableCell>
                                    </TableRow>
                                )}
                                {isQualified && (
                                    <>
                                        <TableRow className="hover:bg-muted/30 transition-colors">
                                            <TableCell className="text-sm font-medium text-muted-foreground">
                                                Number of Qualified Parties
                                            </TableCell>
                                            <TableCell className="text-sm">
                                                {result.qualifiedPartiesCount || '—'}
                                            </TableCell>
                                            <TableCell className="text-sm font-medium text-muted-foreground">
                                                Qualified Parties Names
                                            </TableCell>
                                            <TableCell className="text-sm">
                                                {result.qualifiedPartiesNames &&
                                                    result.qualifiedPartiesNames.length > 0 ? (
                                                    <div className="flex flex-wrap gap-1">
                                                        {result.qualifiedPartiesNames.map((name, idx) => (
                                                            <Badge key={idx} variant="outline" className="text-xs">
                                                                {name}
                                                            </Badge>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    '—'
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    </>
                                )}
                            </>
                        )}

                        {/* Result Information */}
                        {hasResult && (
                            <>
                                <TableRow className="bg-muted/50">
                                    <TableCell colSpan={4} className="font-semibold text-sm">
                                        Result Information
                                    </TableCell>
                                </TableRow>
                                <TableRow className="hover:bg-muted/30 transition-colors">
                                    <TableCell className="text-sm font-medium text-muted-foreground">
                                        Result
                                    </TableCell>
                                    <TableCell>
                                        <Badge
                                            variant={
                                                result.result === 'Won'
                                                    ? 'success'
                                                    : result.result === 'Lost'
                                                        ? 'destructive'
                                                        : 'secondary'
                                            }
                                        >
                                            {result.result}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-sm font-medium text-muted-foreground" colSpan={2}>
                                        {/* Empty */}
                                    </TableCell>
                                </TableRow>
                                {(result.l1Price || result.l2Price || result.ourPrice) && (
                                    <>
                                        <TableRow className="hover:bg-muted/30 transition-colors">
                                            <TableCell className="text-sm font-medium text-muted-foreground">
                                                L1 Price
                                            </TableCell>
                                            <TableCell className="text-sm font-semibold">
                                                {result.l1Price ? formatINR(parseFloat(result.l1Price)) : '—'}
                                            </TableCell>
                                            <TableCell className="text-sm font-medium text-muted-foreground">
                                                L2 Price
                                            </TableCell>
                                            <TableCell className="text-sm font-semibold">
                                                {result.l2Price ? formatINR(parseFloat(result.l2Price)) : '—'}
                                            </TableCell>
                                        </TableRow>
                                        <TableRow className="hover:bg-muted/30 transition-colors">
                                            <TableCell className="text-sm font-medium text-muted-foreground">
                                                Our Price
                                            </TableCell>
                                            <TableCell className="text-sm font-semibold" colSpan={3}>
                                                {result.ourPrice ? formatINR(parseFloat(result.ourPrice)) : '—'}
                                            </TableCell>
                                        </TableRow>
                                        {result.resultReason && (
                                            <TableRow className="hover:bg-muted/30 transition-colors">
                                                <TableCell className="text-sm font-medium text-muted-foreground">
                                                    Reason for Win/Loss
                                                </TableCell>
                                                <TableCell className="text-sm break-words" colSpan={3}>
                                                    {result.resultReason}
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </>
                                )}
                            </>
                        )}

                    </TableBody>
                </Table>
                {/* Screenshots */}
                {(result.qualifiedPartiesScreenshot || result.finalResultScreenshot) && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {result.qualifiedPartiesScreenshot && (
                            <div className="flex flex-col border rounded-md p-3 bg-card shadow-sm gap-2">
                                <div className="flex items-start gap-2 overflow-hidden">
                                    <FileText className="h-6 w-6 text-muted-foreground shrink-0" />
                                    <div className="flex flex-col overflow-hidden">
                                        <span className="font-medium text-sm truncate" title={result.qualifiedPartiesScreenshot.split('/').pop() || result.qualifiedPartiesScreenshot}>
                                            {result.qualifiedPartiesScreenshot.split('/').pop() || result.qualifiedPartiesScreenshot}
                                        </span>
                                        <span className="text-xs text-muted-foreground truncate" title="Qualified Parties Screenshot">
                                            Qualified Parties Screenshot
                                        </span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 mt-auto">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="flex-1 h-8 text-xs gap-1"
                                        onClick={() => window.open(getFileUrl(result.qualifiedPartiesScreenshot!), '_blank')}
                                    >
                                        <ExternalLink className="h-3 w-3" />
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="flex-1 h-8 text-xs gap-1"
                                        onClick={() => {
                                            const a = document.createElement('a');
                                            a.href = getFileUrl(result.qualifiedPartiesScreenshot!);
                                            a.download = result.qualifiedPartiesScreenshot!.split('/').pop() || result.qualifiedPartiesScreenshot!;
                                            a.click();
                                        }}
                                    >
                                        <Download className="h-3 w-3" />
                                    </Button>
                                </div>
                            </div>
                        )}
                        {result.finalResultScreenshot && (
                            <div className="flex flex-col border rounded-md p-3 bg-card shadow-sm gap-2">
                                <div className="flex items-start gap-2 overflow-hidden">
                                    <FileText className="h-6 w-6 text-muted-foreground shrink-0" />
                                    <div className="flex flex-col overflow-hidden">
                                        <span className="font-medium text-sm truncate" title={result.finalResultScreenshot.split('/').pop() || result.finalResultScreenshot}>
                                            {result.finalResultScreenshot.split('/').pop() || result.finalResultScreenshot}
                                        </span>
                                        <span className="text-xs text-muted-foreground truncate" title="Final Price Screenshot">
                                            Final Price Screenshot
                                        </span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 mt-auto">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="flex-1 h-8 text-xs gap-1"
                                        onClick={() => window.open(getFileUrl(result.finalResultScreenshot!), '_blank')}
                                    >
                                        <ExternalLink className="h-3 w-3" />
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="flex-1 h-8 text-xs gap-1"
                                        onClick={() => {
                                            const a = document.createElement('a');
                                            a.href = getFileUrl(result.finalResultScreenshot!);
                                            a.download = result.finalResultScreenshot!.split('/').pop() || result.finalResultScreenshot!;
                                            a.click();
                                        }}
                                    >
                                        <Download className="h-3 w-3" />
                                    </Button>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

/** Self-fetching section for Tender Result */
export function TenderResultSection({ tenderId }: { tenderId: number | null }) {
    const { data: result, isLoading: resultLoading } = useTenderResultByTenderId(tenderId);
    const { data: paymentRequests, isLoading: requestsLoading } = usePaymentRequestsByTender(tenderId);
    const { data: tender, isLoading: tenderLoading } = useTender(tenderId);
    const { data: bidSubmission, isLoading: bidSubmissionLoading } = useBidSubmissionByTender(tenderId ?? 0);

    const isLoading = resultLoading || requestsLoading || tenderLoading || bidSubmissionLoading;

    const resultDataForShow = useMemo(() => {
        if (!result && !tender) return null;

        const emdRequest = paymentRequests?.find(req => req.purpose === 'EMD');
        const emdInstrument = emdRequest?.instruments?.find((inst: any) => inst.isActive);
        const emdDetails = tender?.emd ? {
            amount: tender.emd.toString(),
            instrumentType: emdInstrument?.instrumentType || null,
            instrumentStatus: emdInstrument?.status || null,
            displayText: emdInstrument
                ? `${emdInstrument.instrumentType} (${emdInstrument.status})`
                : tender.emd ? 'Not Requested' : 'Not Applicable',
        } : null;

        return {
            ...result,
            bidSubmissionDate: bidSubmission?.submissionDatetime || null,
            finalPrice: result?.tenderValue || tender?.gstValues || null,
            resultStatus: result?.status || '',
            emdDetails,
        } as any;
    }, [result, paymentRequests, tender, bidSubmission]);

    return <TenderResultShow result={resultDataForShow} isLoading={isLoading} />;
}
