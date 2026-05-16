import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableRow, TableCell } from '@/components/ui/table';
import { XCircle, Clock, Gavel, CheckCircle2, FileText, ExternalLink, Download } from 'lucide-react';
import { formatINR } from '@/hooks/useINRFormatter';
import { Button } from '@/components/ui/button';

import { useTenderResultByTenderId } from '@/hooks/api/useTenderResults';

import { tenderFilesService } from '@/services/api/tender-files.service';
import { BI_STATUSES, getReadableStatusName, getStatusBadgeVariant } from '../../emds-tenderfees/constants';

import type { TenderResult } from '../helpers/tenderResult.types';

interface TenderResultViewProps {
    result: TenderResult;
    onViewRa?: (raId: number) => void;
}

// Helper function to get file URL from stored path
const getFileUrl = (filePath: string): string => {
    if (!filePath) return '';
    let clean = filePath.replace(/[\[\]",]/g, '').trim();
    if (!clean.includes('/')) {
        clean = `result-screenshots/${clean}`;
    }
    const parts = clean.split('/');
    if (parts.length >= 2) {
        const context = parts[0];
        const fileName = parts.slice(1).join('/');
        const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1';
        return `${baseUrl}/tender-files/serve/${context}/${encodeURIComponent(fileName)}`;
    }
    return tenderFilesService.getFileUrl(clean);
};

export function TenderResultView({
    result,
    onViewRa,
}: TenderResultViewProps) {
    if (!result) return null;

    const isQualified = result?.technicallyQualified === 'Yes';
    const isDisqualified = result?.technicallyQualified === 'No';
    const hasResult = !!result.result;

    return (
        <Card>
            <CardContent>
                <Table>
                    <TableBody>
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
                                        {result?.emdDetails?.displayText !== 'Not Applicable' &&
                                            result?.emdDetails?.displayText !== 'Not Requested' &&
                                            result?.emdDetails?.instrumentStatus && (
                                                <Badge variant={getStatusBadgeVariant(result.emdDetails.instrumentStatus) as any}>
                                                    {getReadableStatusName(result.emdDetails.instrumentStatus as keyof typeof BI_STATUSES)}
                                                </Badge>
                                            )}
                                        {result?.emdDetails?.displayText === 'Not Requested' && (
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
    const { data: result, isLoading } = useTenderResultByTenderId(tenderId);

    if (isLoading) {
        return (
            <Card>
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
            <Card>
                <CardContent className="p-8">
                    <div className="flex items-center justify-center text-muted-foreground">
                        Tender Result not yet added.
                    </div>
                </CardContent>
            </Card>
        );
    }

    return <TenderResultView result={result ?? null} />;
}
