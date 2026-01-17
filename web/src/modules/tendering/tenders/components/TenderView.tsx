import { Card, CardAction, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableRow, TableCell } from '@/components/ui/table';
import { Pencil, ArrowLeft, FileText } from 'lucide-react';
import type { TenderInfoWithNames } from '../helpers/tenderInfo.types'
import { formatINR } from '@/hooks/useINRFormatter';
import { formatDateTime } from '@/hooks/useFormatedDate';

interface TenderViewProps {
    tender: TenderInfoWithNames;
    isLoading?: boolean;
    showEditButton?: boolean;
    showBackButton?: boolean;
    onEdit?: () => void;
    onBack?: () => void;
    className?: string;
}

export function TenderView({
    tender,
    isLoading = false,
    showEditButton = true,
    showBackButton = true,
    onEdit,
    onBack,
    className = '',
}: TenderViewProps) {
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

    return (
        <Card className={className}>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Tender Details
                </CardTitle>
                <CardAction className='flex gap-2'>
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
                        {/* Basic Information */}
                        <TableRow className="bg-muted/50">
                            <TableCell colSpan={4} className="font-semibold text-sm">
                                Basic Information
                            </TableCell>
                        </TableRow>
                        <TableRow className="hover:bg-muted/30 transition-colors">
                            <TableCell className="text-sm font-medium text-muted-foreground w-1/4">
                                Tender No
                            </TableCell>
                            <TableCell className="text-sm font-semibold w-1/4">
                                {tender.tenderNo || '—'}
                            </TableCell>
                            <TableCell className="text-sm font-medium text-muted-foreground w-1/4">
                                Status
                            </TableCell>
                            <TableCell className="w-1/4">
                                <Badge variant="outline">{tender.statusName || '—'}</Badge>
                            </TableCell>
                        </TableRow>
                        <TableRow className="hover:bg-muted/30 transition-colors">
                            <TableCell className="text-sm font-medium text-muted-foreground">
                                Tender Name
                            </TableCell>
                            <TableCell className="text-sm" colSpan={3}>
                                {tender.tenderName || '—'}
                            </TableCell>
                        </TableRow>
                        <TableRow className="hover:bg-muted/30 transition-colors">
                            <TableCell className="text-sm font-medium text-muted-foreground">
                                Organization
                            </TableCell>
                            <TableCell className="text-sm">
                                {tender.organizationName || '—'}
                            </TableCell>
                            <TableCell className="text-sm font-medium text-muted-foreground">
                                Item
                            </TableCell>
                            <TableCell className="text-sm">
                                {tender.itemName || '—'}
                            </TableCell>
                        </TableRow>

                        {/* Financial Information */}
                        <TableRow className="bg-muted/50">
                            <TableCell colSpan={4} className="font-semibold text-sm">
                                Financial Information
                            </TableCell>
                        </TableRow>
                        <TableRow className="hover:bg-muted/30 transition-colors">
                            <TableCell className="text-sm font-medium text-muted-foreground">
                                Tender Value (GST Inclusive)
                            </TableCell>
                            <TableCell className="text-sm font-semibold">
                                {formatINR(tender.gstValues ?? 0)}
                            </TableCell>
                            <TableCell className="text-sm font-medium text-muted-foreground">
                                Tender Fee
                            </TableCell>
                            <TableCell className="text-sm font-semibold">
                                {formatINR(tender.tenderFees ?? 0)}
                            </TableCell>
                        </TableRow>
                        <TableRow className="hover:bg-muted/30 transition-colors">
                            <TableCell className="text-sm font-medium text-muted-foreground">
                                EMD
                            </TableCell>
                            <TableCell className="text-sm font-semibold">
                                {formatINR(tender.emd ?? 0)}
                            </TableCell>
                            <TableCell className="text-sm font-medium text-muted-foreground">
                                Due Date & Time
                            </TableCell>
                            <TableCell className="text-sm">
                                {formatDateTime(tender.dueDate)}
                            </TableCell>
                        </TableRow>

                        {/* Assignment & Location */}
                        <TableRow className="bg-muted/50">
                            <TableCell colSpan={4} className="font-semibold text-sm">
                                Assignment & Location
                            </TableCell>
                        </TableRow>
                        <TableRow className="hover:bg-muted/30 transition-colors">
                            <TableCell className="text-sm font-medium text-muted-foreground">
                                Team Member
                            </TableCell>
                            <TableCell className="text-sm">
                                {tender.teamMemberName || (
                                    <span className="text-muted-foreground italic">Unassigned</span>
                                )}
                            </TableCell>
                            <TableCell className="text-sm font-medium text-muted-foreground">
                                Location
                            </TableCell>
                            <TableCell className="text-sm">
                                {tender.locationName || '—'} <span className='text-gray-400'>({tender.locationState})</span>
                            </TableCell>
                        </TableRow>
                        <TableRow className="hover:bg-muted/30 transition-colors">
                            <TableCell className="text-sm font-medium text-muted-foreground">
                                Website
                            </TableCell>
                            <TableCell className="text-sm" colSpan={3}>
                                {tender.websiteLink ? (() => {
                                    const url = tender.websiteLink.startsWith('http://') || tender.websiteLink.startsWith('https://')
                                        ? tender.websiteLink
                                        : `https://${tender.websiteLink}`;
                                    return (
                                        <a
                                            href={url}
                                            target='_blank'
                                            rel='noopener noreferrer'
                                            className='hover:text-primary underline'
                                        >
                                            {tender.websiteName || tender.websiteLink.replace(/^https?:\/\//i, "")}
                                        </a>
                                    );
                                })() : (
                                    '—'
                                )}
                            </TableCell>
                        </TableRow>

                        {/* Additional Information */}
                        {tender.remarks && (
                            <>
                                <TableRow className="bg-muted/50">
                                    <TableCell colSpan={4} className="font-semibold text-sm">
                                        Additional Information
                                    </TableCell>
                                </TableRow>
                                <TableRow className="hover:bg-muted/30 transition-colors">
                                    <TableCell className="text-sm font-medium text-muted-foreground">
                                        Remarks
                                    </TableCell>
                                    <TableCell className="text-sm" colSpan={3}>
                                        {tender.remarks}
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
