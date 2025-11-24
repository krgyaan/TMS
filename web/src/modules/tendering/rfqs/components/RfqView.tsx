import { Card, CardAction, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Pencil, ArrowLeft, FileText, ExternalLink } from 'lucide-react';
import type { Rfq, TenderInfoWithNames } from '@/types/api.types';
import { formatDateTime } from '@/hooks/useFormatedDate';

interface RfqViewProps {
    rfq: Rfq;
    tender?: TenderInfoWithNames;
    isLoading?: boolean;
    showEditButton?: boolean;
    showBackButton?: boolean;
    onEdit?: () => void;
    onBack?: () => void;
    className?: string;
}

export function RfqView({
    rfq,
    tender,
    isLoading = false,
    showEditButton = true,
    showBackButton = true,
    onEdit,
    onBack,
    className = '',
}: RfqViewProps) {
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
                    RFQ Details
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
                            {/* Tender Information */}
                            {tender && (
                                <>
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
                                            Item
                                        </td>
                                        <td className="px-4 py-3 text-sm">
                                            {tender.itemName || '—'}
                                        </td>
                                        <td className="px-4 py-3 text-sm font-medium text-muted-foreground">
                                            Team Member
                                        </td>
                                        <td className="px-4 py-3 text-sm">
                                            {tender.teamMemberName || '—'}
                                        </td>
                                    </tr>
                                </>
                            )}

                            {/* RFQ Information */}
                            <tr className="bg-muted/50">
                                <td colSpan={4} className="px-4 py-3 font-semibold text-sm">
                                    RFQ Information
                                </td>
                            </tr>
                            <tr className="hover:bg-muted/30 transition-colors">
                                <td className="px-4 py-3 text-sm font-medium text-muted-foreground w-1/4">
                                    RFQ ID
                                </td>
                                <td className="px-4 py-3 text-sm font-semibold w-1/4">
                                    #{rfq.id}
                                </td>
                                <td className="px-4 py-3 text-sm font-medium text-muted-foreground w-1/4">
                                    Due Date & Time
                                </td>
                                <td className="px-4 py-3 text-sm w-1/4">
                                    {rfq.dueDate ? formatDateTime(rfq.dueDate) : '—'}
                                </td>
                            </tr>
                            <tr className="hover:bg-muted/30 transition-colors">
                                <td className="px-4 py-3 text-sm font-medium text-muted-foreground">
                                    Requested Vendor IDs
                                </td>
                                <td className="px-4 py-3 text-sm" colSpan={3}>
                                    {rfq.requestedVendor || '—'}
                                </td>
                            </tr>
                            <tr className="hover:bg-muted/30 transition-colors">
                                <td className="px-4 py-3 text-sm font-medium text-muted-foreground">
                                    Created At
                                </td>
                                <td className="px-4 py-3 text-sm">
                                    {formatDateTime(rfq.createdAt)}
                                </td>
                                <td className="px-4 py-3 text-sm font-medium text-muted-foreground">
                                    Last Updated
                                </td>
                                <td className="px-4 py-3 text-sm">
                                    {formatDateTime(rfq.updatedAt)}
                                </td>
                            </tr>

                            {/* Requirements */}
                            {rfq.items && rfq.items.length > 0 && (
                                <>
                                    <tr className="bg-muted/50">
                                        <td colSpan={4} className="px-4 py-3 font-semibold text-sm">
                                            Requirements ({rfq.items.length} {rfq.items.length === 1 ? 'Item' : 'Items'})
                                        </td>
                                    </tr>
                                    {rfq.items.map((item, index) => (
                                        <tr key={item.id} className="hover:bg-muted/30 transition-colors">
                                            <td className="px-4 py-3 text-sm font-medium text-muted-foreground align-top">
                                                <Badge variant="secondary" className="text-xs">
                                                    Item {index + 1}
                                                </Badge>
                                            </td>
                                            <td className="px-4 py-3 text-sm" colSpan={2}>
                                                {item.requirement}
                                            </td>
                                            <td className="px-4 py-3 text-sm text-right">
                                                <span className="font-medium">{item.qty || '—'}</span>
                                                {item.unit && <span className="text-muted-foreground ml-1">{item.unit}</span>}
                                            </td>
                                        </tr>
                                    ))}
                                </>
                            )}

                            {/* Documents */}
                            {rfq.documents && rfq.documents.length > 0 && (
                                <>
                                    <tr className="bg-muted/50">
                                        <td colSpan={4} className="px-4 py-3 font-semibold text-sm">
                                            Documents ({rfq.documents.length})
                                        </td>
                                    </tr>
                                    {rfq.documents.map((doc) => (
                                        <tr key={doc.id} className="hover:bg-muted/30 transition-colors">
                                            <td className="px-4 py-3 text-sm font-medium text-muted-foreground">
                                                {doc.docType}
                                            </td>
                                            <td className="px-4 py-3 text-sm" colSpan={2}>
                                                <span className="text-xs text-muted-foreground font-mono break-all">
                                                    {doc.path}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-sm text-right">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => window.open(doc.path, '_blank')}
                                                >
                                                    <ExternalLink className="h-4 w-4 mr-1" />
                                                    View
                                                </Button>
                                            </td>
                                        </tr>
                                    ))}
                                </>
                            )}

                            {/* Additional Information */}
                            {rfq.docList && (
                                <>
                                    <tr className="bg-muted/50">
                                        <td colSpan={4} className="px-4 py-3 font-semibold text-sm">
                                            Additional Information
                                        </td>
                                    </tr>
                                    <tr className="hover:bg-muted/30 transition-colors">
                                        <td className="px-4 py-3 text-sm font-medium text-muted-foreground align-top">
                                            Other Documents Needed
                                        </td>
                                        <td className="px-4 py-3 text-sm" colSpan={3}>
                                            <p className="whitespace-pre-wrap">{rfq.docList}</p>
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
