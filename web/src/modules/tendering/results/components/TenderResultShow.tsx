import { Card, CardAction, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableRow, TableCell } from '@/components/ui/table';
import { Pencil, ArrowLeft, Trophy, XCircle, Clock, Gavel, CheckCircle2 } from 'lucide-react';
import { formatINR } from '@/hooks/useINRFormatter';
import { formatDateTime } from '@/hooks/useFormatedDate';
import type { ResultDashboardRow } from '../helpers/tenderResult.types';

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
    };
    isLoading?: boolean;
    showEditButton?: boolean;
    showBackButton?: boolean;
    onEdit?: () => void;
    onBack?: () => void;
    onViewRa?: (raId: number) => void;
    className?: string;
}

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
    showEditButton = true,
    showBackButton = true,
    onEdit,
    onBack,
    onViewRa,
    className = '',
}: TenderResultShowProps) {
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

    const isQualified = result.technicallyQualified === 'Yes';
    const isDisqualified = result.technicallyQualified === 'No';
    const hasResult = !!result.result;

    return (
        <Card className={className}>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Trophy className="h-5 w-5" />
                    Tender Result Details
                </CardTitle>
                <CardAction className="flex gap-2">
                    {showEditButton && onEdit && (
                        <Button variant="default" size="sm" onClick={onEdit}>
                            <Pencil className="h-4 w-4 mr-2" />
                            Edit
                        </Button>
                    )}
                    {showBackButton && onBack && (
                        <Button variant="outline" size="sm" onClick={onBack}>
                            <ArrowLeft className="h-4 w-4 mr-2" />
                            Back
                        </Button>
                    )}
                </CardAction>
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
                                <Badge variant={getStatusVariant(result.resultStatus) as any}>
                                    {result.resultStatus}
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
                                        <TableCell className="text-sm" colSpan={3}>
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
                                    </>
                                )}
                            </>
                        )}

                        {/* Screenshots */}
                        {(result.qualifiedPartiesScreenshot || result.finalResultScreenshot) && (
                            <>
                                <TableRow className="bg-muted/50">
                                    <TableCell colSpan={4} className="font-semibold text-sm">
                                        Screenshots
                                    </TableCell>
                                </TableRow>
                                {result.qualifiedPartiesScreenshot && (
                                    <TableRow className="hover:bg-muted/30 transition-colors">
                                        <TableCell className="text-sm font-medium text-muted-foreground">
                                            Qualified Parties Screenshot
                                        </TableCell>
                                        <TableCell className="text-sm" colSpan={3}>
                                            <a
                                                href={result.qualifiedPartiesScreenshot}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-primary hover:underline"
                                            >
                                                View Screenshot
                                            </a>
                                        </TableCell>
                                    </TableRow>
                                )}
                                {result.finalResultScreenshot && (
                                    <TableRow className="hover:bg-muted/30 transition-colors">
                                        <TableCell className="text-sm font-medium text-muted-foreground">
                                            Final Result Screenshot
                                        </TableCell>
                                        <TableCell className="text-sm" colSpan={3}>
                                            <a
                                                href={result.finalResultScreenshot}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-primary hover:underline"
                                            >
                                                View Screenshot
                                            </a>
                                        </TableCell>
                                    </TableRow>
                                )}
                            </>
                        )}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}
