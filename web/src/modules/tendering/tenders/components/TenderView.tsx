import { Card, CardAction, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Pencil, ArrowLeft, FileText } from 'lucide-react';
import type { TenderInfoWithNames } from '@/types/api.types'
import { formatINR } from '@/hooks/useINRFormatter';
import { formatDateTime } from '@/hooks/useFormatedDate';
import { Link } from 'react-router-dom';

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
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <tbody className="divide-y divide-border">
                            {/* Basic Information */}
                            <tr className="bg-muted/50">
                                <td colSpan={4} className="px-4 py-3 font-semibold text-sm">
                                    Basic Information
                                </td>
                            </tr>
                            <tr className="hover:bg-muted/30 transition-colors">
                                <td className="px-4 py-3 text-sm font-medium text-muted-foreground w-1/4">
                                    Tender No
                                </td>
                                <td className="px-4 py-3 text-sm font-semibold w-1/4">
                                    {tender.tenderNo || '—'}
                                </td>
                                <td className="px-4 py-3 text-sm font-medium text-muted-foreground w-1/4">
                                    Status
                                </td>
                                <td className="px-4 py-3 w-1/4">
                                    <Badge variant="outline">{tender.statusName || '—'}</Badge>
                                </td>
                            </tr>
                            <tr className="hover:bg-muted/30 transition-colors">
                                <td className="px-4 py-3 text-sm font-medium text-muted-foreground">
                                    Tender Name
                                </td>
                                <td className="px-4 py-3 text-sm" colSpan={3}>
                                    {tender.tenderName || '—'}
                                </td>
                            </tr>
                            <tr className="hover:bg-muted/30 transition-colors">
                                <td className="px-4 py-3 text-sm font-medium text-muted-foreground">
                                    Organization
                                </td>
                                <td className="px-4 py-3 text-sm">
                                    {tender.organizationName || '—'}
                                </td>
                                <td className="px-4 py-3 text-sm font-medium text-muted-foreground">
                                    Item
                                </td>
                                <td className="px-4 py-3 text-sm">
                                    {tender.itemName || '—'}
                                </td>
                            </tr>

                            {/* Financial Information */}
                            <tr className="bg-muted/50">
                                <td colSpan={4} className="px-4 py-3 font-semibold text-sm">
                                    Financial Information
                                </td>
                            </tr>
                            <tr className="hover:bg-muted/30 transition-colors">
                                <td className="px-4 py-3 text-sm font-medium text-muted-foreground">
                                    Tender Value (GST Inclusive)
                                </td>
                                <td className="px-4 py-3 text-sm font-semibold">
                                    {formatINR(tender.gstValues ?? 0)}
                                </td>
                                <td className="px-4 py-3 text-sm font-medium text-muted-foreground">
                                    Tender Fee
                                </td>
                                <td className="px-4 py-3 text-sm font-semibold">
                                    {formatINR(tender.tenderFees ?? 0)}
                                </td>
                            </tr>
                            <tr className="hover:bg-muted/30 transition-colors">
                                <td className="px-4 py-3 text-sm font-medium text-muted-foreground">
                                    EMD
                                </td>
                                <td className="px-4 py-3 text-sm font-semibold">
                                    {formatINR(tender.emd ?? 0)}
                                </td>
                                <td className="px-4 py-3 text-sm font-medium text-muted-foreground">
                                    Due Date & Time
                                </td>
                                <td className="px-4 py-3 text-sm">
                                    {formatDateTime(tender.dueDate)}
                                </td>
                            </tr>

                            {/* Assignment & Location */}
                            <tr className="bg-muted/50">
                                <td colSpan={4} className="px-4 py-3 font-semibold text-sm">
                                    Assignment & Location
                                </td>
                            </tr>
                            <tr className="hover:bg-muted/30 transition-colors">
                                <td className="px-4 py-3 text-sm font-medium text-muted-foreground">
                                    Team Member
                                </td>
                                <td className="px-4 py-3 text-sm">
                                    {tender.teamMemberName || (
                                        <span className="text-muted-foreground italic">Unassigned</span>
                                    )}
                                </td>
                                <td className="px-4 py-3 text-sm font-medium text-muted-foreground">
                                    Location
                                </td>
                                <td className="px-4 py-3 text-sm">
                                    {tender.locationName || '—'} <span className='text-gray-400'>({tender.locationState})</span>
                                </td>
                            </tr>
                            <tr className="hover:bg-muted/30 transition-colors">
                                <td className="px-4 py-3 text-sm font-medium text-muted-foreground">
                                    Website
                                </td>
                                <td className="px-4 py-3 text-sm" colSpan={3}>
                                    <Link to={tender.websiteLink ?? '#'} target='_blank' className='hover:text-primary'>{tender.websiteName || '—'}</Link>
                                </td>
                            </tr>

                            {/* Additional Information */}
                            {tender.remarks && (
                                <>
                                    <tr className="bg-muted/50">
                                        <td colSpan={4} className="px-4 py-3 font-semibold text-sm">
                                            Additional Information
                                        </td>
                                    </tr>
                                    <tr className="hover:bg-muted/30 transition-colors">
                                        <td className="px-4 py-3 text-sm font-medium text-muted-foreground">
                                            Remarks
                                        </td>
                                        <td className="px-4 py-3 text-sm" colSpan={3}>
                                            {tender.remarks}
                                        </td>
                                    </tr>
                                </>
                            )}
                        </tbody>
                    </table>
                </div>
            </CardContent>
        </Card>
    );
}
