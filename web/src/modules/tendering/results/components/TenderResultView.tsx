import { Fragment } from 'react';
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
    if (!filePath.includes('/')) {
        return tenderFilesService.getFileUrl(`result-screenshots/${filePath}`);
    }
    const parts = filePath.split('/');
    if (parts.length >= 2) {
        const context = parts[0];
        const fileName = parts.slice(1).join('/');
        const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1';
        return `${baseUrl}/tender-files/serve/${context}/${encodeURIComponent(fileName)}`;
    }
    return tenderFilesService.getFileUrl(filePath);
};

export function TenderResultView({
    result,
    onViewRa,
}: TenderResultViewProps) {
    if (!result) return null;

    const isQualified = result?.technicallyQualified === 'Yes';
    const isDisqualified = result?.technicallyQualified === 'No';

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

                        {/* Result Information - Per Detail */}
                        {result.details && result.details.length > 0 && result.details.map((detail, idx) => (
                            <Fragment key={detail.id || idx}>
                                <TableRow className="bg-muted/50">
                                    <TableCell colSpan={4} className="font-semibold text-sm">
                                        Line Item Result #{idx + 1}
                                    </TableCell>
                                </TableRow>
                                <TableRow className="hover:bg-muted/30 transition-colors">
                                    <TableCell className="text-sm font-medium text-muted-foreground">
                                        Result
                                    </TableCell>
                                    <TableCell>
                                        {detail.result ? (
                                            <Badge
                                                variant={
                                                    detail.result === 'Won'
                                                        ? 'success'
                                                        : detail.result === 'Lost'
                                                            ? 'destructive'
                                                            : 'secondary'
                                                }
                                            >
                                                {detail.result}
                                            </Badge>
                                        ) : '—'}
                                    </TableCell>
                                    <TableCell className="text-sm font-medium text-muted-foreground" colSpan={2} />
                                </TableRow>
                                {detail.result !== 'Cancelled' && (detail.l1Price || detail.l2Price || detail.ourPrice) && (
                                    <>
                                        <TableRow className="hover:bg-muted/30 transition-colors">
                                            <TableCell className="text-sm font-medium text-muted-foreground">
                                                L1 Price
                                            </TableCell>
                                            <TableCell className="text-sm font-semibold">
                                                {detail.l1Price ? formatINR(parseFloat(detail.l1Price)) : '—'}
                                            </TableCell>
                                            <TableCell className="text-sm font-medium text-muted-foreground">
                                                L2 Price
                                            </TableCell>
                                            <TableCell className="text-sm font-semibold">
                                                {detail.l2Price ? formatINR(parseFloat(detail.l2Price)) : '—'}
                                            </TableCell>
                                        </TableRow>
                                        <TableRow className="hover:bg-muted/30 transition-colors">
                                            <TableCell className="text-sm font-medium text-muted-foreground">
                                                Our Price
                                            </TableCell>
                                            <TableCell className="text-sm font-semibold" colSpan={3}>
                                                {detail.ourPrice ? formatINR(parseFloat(detail.ourPrice)) : '—'}
                                            </TableCell>
                                        </TableRow>
                                    </>
                                )}
                                {detail.resultReason && (
                                    <TableRow className="hover:bg-muted/30 transition-colors">
                                        <TableCell className="text-sm font-medium text-muted-foreground">
                                            Reason
                                        </TableCell>
                                        <TableCell className="text-sm break-words" colSpan={3}>
                                            {detail.resultReason}
                                        </TableCell>
                                    </TableRow>
                                )}
                                {((detail.qualifiedPartiesScreenshot?.length ?? 0) > 0 || (detail.finalResultScreenshot?.length ?? 0) > 0) && (
                                    <TableRow>
                                        <TableCell colSpan={4}>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                {(detail.qualifiedPartiesScreenshot ?? []).map((path, i) => (
                                                    <div key={`qp-${i}`} className="flex flex-col border rounded-md p-3 bg-card shadow-sm gap-2">
                                                        <div className="flex items-start gap-2 overflow-hidden">
                                                            <FileText className="h-6 w-6 text-muted-foreground shrink-0" />
                                                            <div className="flex flex-col overflow-hidden">
                                                                <span className="font-medium text-sm truncate" title={path.split('/').pop() || path}>
                                                                    {path.split('/').pop() || path}
                                                                </span>
                                                                <span className="text-xs text-muted-foreground truncate">Qualified Parties Screenshot {detail.qualifiedPartiesScreenshot!.length > 1 ? `#${i + 1}` : ''}</span>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-2 mt-auto">
                                                            <Button variant="ghost" size="sm" className="flex-1 h-8 text-xs gap-1"
                                                                onClick={() => window.open(getFileUrl(path), '_blank')}>
                                                                <ExternalLink className="h-3 w-3" />
                                                            </Button>
                                                            <Button variant="ghost" size="sm" className="flex-1 h-8 text-xs gap-1"
                                                                onClick={() => { const a = document.createElement('a'); a.href = getFileUrl(path); a.download = path.split('/').pop() || path; a.click(); }}>
                                                                <Download className="h-3 w-3" />
                                                            </Button>
                                                        </div>
                                                    </div>
                                                ))}
                                                {(detail.finalResultScreenshot ?? []).map((path, i) => (
                                                    <div key={`fr-${i}`} className="flex flex-col border rounded-md p-3 bg-card shadow-sm gap-2">
                                                        <div className="flex items-start gap-2 overflow-hidden">
                                                            <FileText className="h-6 w-6 text-muted-foreground shrink-0" />
                                                            <div className="flex flex-col overflow-hidden">
                                                                <span className="font-medium text-sm truncate" title={path.split('/').pop() || path}>
                                                                    {path.split('/').pop() || path}
                                                                </span>
                                                                <span className="text-xs text-muted-foreground truncate">Final Result Screenshot {detail.finalResultScreenshot!.length > 1 ? `#${i + 1}` : ''}</span>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-2 mt-auto">
                                                            <Button variant="ghost" size="sm" className="flex-1 h-8 text-xs gap-1"
                                                                onClick={() => window.open(getFileUrl(path), '_blank')}>
                                                                <ExternalLink className="h-3 w-3" />
                                                            </Button>
                                                            <Button variant="ghost" size="sm" className="flex-1 h-8 text-xs gap-1"
                                                                onClick={() => { const a = document.createElement('a'); a.href = getFileUrl(path); a.download = path.split('/').pop() || path; a.click(); }}>
                                                                <Download className="h-3 w-3" />
                                                            </Button>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                )}
                            </Fragment>
                        ))}
                    </TableBody>
                </Table>
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
