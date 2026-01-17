import { Card, CardAction, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Pencil, ArrowLeft, Gavel, Calendar, CheckCircle2, XCircle, Clock } from 'lucide-react';
import { formatINR } from '@/hooks/useINRFormatter';
import { formatDateTime } from '@/hooks/useFormatedDate';
import type { RaDashboardRow } from '../helpers/reverseAuction.types';

interface RaShowProps {
    ra: RaDashboardRow & {
        disqualificationReason?: string | null;
        qualifiedPartiesCount?: string | null;
        qualifiedPartiesNames?: string[] | null;
        raResult?: string | null;
        veL1AtStart?: string | null;
        raStartPrice?: string | null;
        raClosePrice?: string | null;
        raCloseTime?: Date | null;
        screenshotQualifiedParties?: string | null;
        screenshotDecrements?: string | null;
        finalResultScreenshot?: string | null;
    };
    isLoading?: boolean;
    showEditButton?: boolean;
    showBackButton?: boolean;
    onEdit?: () => void;
    onBack?: () => void;
    className?: string;
}

const getStatusVariant = (status: string): string => {
    switch (status) {
        case 'Under Evaluation':
            return 'secondary';
        case 'RA Scheduled':
            return 'info';
        case 'RA Started':
            return 'warning';
        case 'RA Ended':
            return 'outline';
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

export function RaShow({
    ra,
    isLoading = false,
    showEditButton = true,
    showBackButton = true,
    onEdit,
    onBack,
    className = '',
}: RaShowProps) {
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

    const isQualified = ra.technicallyQualified === 'Yes';
    const isDisqualified = ra.technicallyQualified === 'No';
    const hasResult = !!ra.raResult;

    return (
        <Card className={className}>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Gavel className="h-5 w-5" />
                    Reverse Auction Details
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
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <tbody className="divide-y divide-border">
                            {/* Tender Information */}
                            <tr className="bg-muted/50">
                                <td colSpan={4} className="px-4 py-3 font-semibold text-sm">
                                    Tender Information
                                </td>
                            </tr>
                            <tr className="hover:bg-muted/30 transition-colors">
                                <td className="px-4 py-3 text-sm font-medium text-muted-foreground w-1/4">
                                    Tender No
                                </td>
                                <td className="px-4 py-3 text-sm font-semibold w-1/4">
                                    {ra.tenderNo || '—'}
                                </td>
                                <td className="px-4 py-3 text-sm font-medium text-muted-foreground w-1/4">
                                    Tender Name
                                </td>
                                <td className="px-4 py-3 text-sm w-1/4">
                                    {ra.tenderName || '—'}
                                </td>
                            </tr>
                            <tr className="hover:bg-muted/30 transition-colors">
                                <td className="px-4 py-3 text-sm font-medium text-muted-foreground">
                                    Team Member
                                </td>
                                <td className="px-4 py-3 text-sm">
                                    {ra.teamMemberName || '—'}
                                </td>
                                <td className="px-4 py-3 text-sm font-medium text-muted-foreground">
                                    Item
                                </td>
                                <td className="px-4 py-3 text-sm">
                                    {ra.itemName || '—'}
                                </td>
                            </tr>
                            <tr className="hover:bg-muted/30 transition-colors">
                                <td className="px-4 py-3 text-sm font-medium text-muted-foreground">
                                    Bid Submission Date
                                </td>
                                <td className="px-4 py-3 text-sm">
                                    {ra.bidSubmissionDate ? formatDateTime(ra.bidSubmissionDate) : '—'}
                                </td>
                                <td className="px-4 py-3 text-sm font-medium text-muted-foreground">
                                    Tender Value
                                </td>
                                <td className="px-4 py-3 text-sm font-semibold">
                                    {ra.tenderValue ? formatINR(parseFloat(ra.tenderValue)) : '—'}
                                </td>
                            </tr>
                            <tr className="hover:bg-muted/30 transition-colors">
                                <td className="px-4 py-3 text-sm font-medium text-muted-foreground">
                                    Tender Status
                                </td>
                                <td className="px-4 py-3 text-sm">
                                    {ra.tenderStatus || '—'}
                                </td>
                                <td className="px-4 py-3 text-sm font-medium text-muted-foreground">
                                    RA Status
                                </td>
                                <td className="px-4 py-3">
                                    <Badge variant={getStatusVariant(ra.raStatus) as any}>
                                        {ra.raStatus}
                                    </Badge>
                                </td>
                            </tr>

                            {/* Technical Qualification */}
                            <tr className="bg-muted/50">
                                <td colSpan={4} className="px-4 py-3 font-semibold text-sm">
                                    Technical Qualification
                                </td>
                            </tr>
                            <tr className="hover:bg-muted/30 transition-colors">
                                <td className="px-4 py-3 text-sm font-medium text-muted-foreground">
                                    Technically Qualified
                                </td>
                                <td className="px-4 py-3" colSpan={3}>
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
                                </td>
                            </tr>
                            {isDisqualified && ra.disqualificationReason && (
                                <tr className="hover:bg-muted/30 transition-colors">
                                    <td className="px-4 py-3 text-sm font-medium text-muted-foreground">
                                        Disqualification Reason
                                    </td>
                                    <td className="px-4 py-3 text-sm" colSpan={3}>
                                        {ra.disqualificationReason}
                                    </td>
                                </tr>
                            )}

                            {/* Qualified Parties Information */}
                            {isQualified && (
                                <>
                                    <tr className="bg-muted/50">
                                        <td colSpan={4} className="px-4 py-3 font-semibold text-sm">
                                            Qualified Parties Information
                                        </td>
                                    </tr>
                                    <tr className="hover:bg-muted/30 transition-colors">
                                        <td className="px-4 py-3 text-sm font-medium text-muted-foreground">
                                            Number of Qualified Parties
                                        </td>
                                        <td className="px-4 py-3 text-sm">
                                            {ra.qualifiedPartiesCount || '—'}
                                        </td>
                                        <td className="px-4 py-3 text-sm font-medium text-muted-foreground">
                                            Qualified Parties Names
                                        </td>
                                        <td className="px-4 py-3 text-sm">
                                            {ra.qualifiedPartiesNames && ra.qualifiedPartiesNames.length > 0 ? (
                                                <div className="flex flex-wrap gap-1">
                                                    {ra.qualifiedPartiesNames.map((name, idx) => (
                                                        <Badge key={idx} variant="outline" className="text-xs">
                                                            {name}
                                                        </Badge>
                                                    ))}
                                                </div>
                                            ) : (
                                                '—'
                                            )}
                                        </td>
                                    </tr>
                                </>
                            )}

                            {/* RA Schedule */}
                            {isQualified && (ra.raStartTime || ra.raEndTime) && (
                                <>
                                    <tr className="bg-muted/50">
                                        <td colSpan={4} className="px-4 py-3 font-semibold text-sm">
                                            RA Schedule
                                        </td>
                                    </tr>
                                    <tr className="hover:bg-muted/30 transition-colors">
                                        <td className="px-4 py-3 text-sm font-medium text-muted-foreground">
                                            RA Start Time
                                        </td>
                                        <td className="px-4 py-3 text-sm">
                                            {ra.raStartTime ? formatDateTime(ra.raStartTime) : '—'}
                                        </td>
                                        <td className="px-4 py-3 text-sm font-medium text-muted-foreground">
                                            RA End Time
                                        </td>
                                        <td className="px-4 py-3 text-sm">
                                            {ra.raEndTime ? formatDateTime(ra.raEndTime) : '—'}
                                        </td>
                                    </tr>
                                </>
                            )}

                            {/* RA Result */}
                            {hasResult && (
                                <>
                                    <tr className="bg-muted/50">
                                        <td colSpan={4} className="px-4 py-3 font-semibold text-sm">
                                            RA Result
                                        </td>
                                    </tr>
                                    <tr className="hover:bg-muted/30 transition-colors">
                                        <td className="px-4 py-3 text-sm font-medium text-muted-foreground">
                                            Result
                                        </td>
                                        <td className="px-4 py-3">
                                            <Badge
                                                variant={
                                                    ra.raResult === 'Won'
                                                        ? 'success'
                                                        : ra.raResult === 'Lost' || ra.raResult === 'H1 Elimination'
                                                        ? 'destructive'
                                                        : 'secondary'
                                                }
                                            >
                                                {ra.raResult}
                                            </Badge>
                                        </td>
                                        <td className="px-4 py-3 text-sm font-medium text-muted-foreground">
                                            VE L1 at Start
                                        </td>
                                        <td className="px-4 py-3 text-sm">
                                            {ra.veL1AtStart || '—'}
                                        </td>
                                    </tr>
                                    {(ra.raStartPrice || ra.raClosePrice) && (
                                        <tr className="hover:bg-muted/30 transition-colors">
                                            <td className="px-4 py-3 text-sm font-medium text-muted-foreground">
                                                RA Start Price
                                            </td>
                                            <td className="px-4 py-3 text-sm font-semibold">
                                                {ra.raStartPrice ? formatINR(parseFloat(ra.raStartPrice)) : '—'}
                                            </td>
                                            <td className="px-4 py-3 text-sm font-medium text-muted-foreground">
                                                RA Close Price
                                            </td>
                                            <td className="px-4 py-3 text-sm font-semibold">
                                                {ra.raClosePrice ? formatINR(parseFloat(ra.raClosePrice)) : '—'}
                                            </td>
                                        </tr>
                                    )}
                                    {ra.raCloseTime && (
                                        <tr className="hover:bg-muted/30 transition-colors">
                                            <td className="px-4 py-3 text-sm font-medium text-muted-foreground">
                                                RA Close Time
                                            </td>
                                            <td className="px-4 py-3 text-sm" colSpan={3}>
                                                {formatDateTime(ra.raCloseTime)}
                                            </td>
                                        </tr>
                                    )}
                                </>
                            )}

                            {/* Screenshots */}
                            {(ra.screenshotQualifiedParties ||
                                ra.screenshotDecrements ||
                                ra.finalResultScreenshot) && (
                                <>
                                    <tr className="bg-muted/50">
                                        <td colSpan={4} className="px-4 py-3 font-semibold text-sm">
                                            Screenshots
                                        </td>
                                    </tr>
                                    {ra.screenshotQualifiedParties && (
                                        <tr className="hover:bg-muted/30 transition-colors">
                                            <td className="px-4 py-3 text-sm font-medium text-muted-foreground">
                                                Qualified Parties Screenshot
                                            </td>
                                            <td className="px-4 py-3 text-sm" colSpan={3}>
                                                <a
                                                    href={ra.screenshotQualifiedParties}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-primary hover:underline"
                                                >
                                                    View Screenshot
                                                </a>
                                            </td>
                                        </tr>
                                    )}
                                    {ra.screenshotDecrements && (
                                        <tr className="hover:bg-muted/30 transition-colors">
                                            <td className="px-4 py-3 text-sm font-medium text-muted-foreground">
                                                Decrements Screenshot
                                            </td>
                                            <td className="px-4 py-3 text-sm" colSpan={3}>
                                                <a
                                                    href={ra.screenshotDecrements}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-primary hover:underline"
                                                >
                                                    View Screenshot
                                                </a>
                                            </td>
                                        </tr>
                                    )}
                                    {ra.finalResultScreenshot && (
                                        <tr className="hover:bg-muted/30 transition-colors">
                                            <td className="px-4 py-3 text-sm font-medium text-muted-foreground">
                                                Final Result Screenshot
                                            </td>
                                            <td className="px-4 py-3 text-sm" colSpan={3}>
                                                <a
                                                    href={ra.finalResultScreenshot}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-primary hover:underline"
                                                >
                                                    View Screenshot
                                                </a>
                                            </td>
                                        </tr>
                                    )}
                                </>
                            )}
                        </tbody>
                    </table>
                </div>
            </CardContent>
        </Card>
    );
}
