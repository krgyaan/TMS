import { Card, CardAction, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableRow, TableCell } from '@/components/ui/table';
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
                <Table>
                    <TableBody>
                        {/* RFQ Information */}
                        <TableRow className="bg-muted/50">
                            <TableCell colSpan={4} className="font-semibold text-sm">
                                RFQ Information
                            </TableCell>
                        </TableRow>
                        <TableRow className="hover:bg-muted/30 transition-colors">
                            <TableCell className="text-sm font-medium text-muted-foreground w-1/4">
                                RFQ ID
                            </TableCell>
                            <TableCell className="text-sm font-semibold w-1/4">
                                #{rfq.id}
                            </TableCell>
                            <TableCell className="text-sm font-medium text-muted-foreground w-1/4">
                                Due Date & Time
                            </TableCell>
                            <TableCell className="text-sm w-1/4">
                                {rfq.dueDate ? formatDateTime(rfq.dueDate) : '—'}
                            </TableCell>
                        </TableRow>
                        <TableRow className="hover:bg-muted/30 transition-colors">
                            <TableCell className="text-sm font-medium text-muted-foreground">
                                Requested Vendor IDs
                            </TableCell>
                            <TableCell className="text-sm" colSpan={3}>
                                {rfq.vendorOrganizationNames || '—'}
                            </TableCell>
                        </TableRow>
                        <TableRow className="hover:bg-muted/30 transition-colors">
                            <TableCell className="text-sm font-medium text-muted-foreground">
                                Created At
                            </TableCell>
                            <TableCell className="text-sm">
                                {formatDateTime(rfq.createdAt)}
                            </TableCell>
                            <TableCell className="text-sm font-medium text-muted-foreground">
                                Last Updated
                            </TableCell>
                            <TableCell className="text-sm">
                                {formatDateTime(rfq.updatedAt)}
                            </TableCell>
                        </TableRow>

                        {/* Requirements */}
                        {rfq.items && rfq.items.length > 0 && (
                            <>
                                <TableRow className="bg-muted/50">
                                    <TableCell colSpan={4} className="font-semibold text-sm">
                                        Requirements ({rfq.items.length} {rfq.items.length === 1 ? 'Item' : 'Items'})
                                    </TableCell>
                                </TableRow>
                                {rfq.items.map((item, index) => (
                                    <TableRow key={item.id} className="hover:bg-muted/30 transition-colors">
                                        <TableCell className="text-sm font-medium text-muted-foreground align-top">
                                            <Badge variant="secondary" className="text-xs">
                                                Item {index + 1}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-sm" colSpan={2}>
                                            {item.requirement}
                                        </TableCell>
                                        <TableCell className="text-sm text-right">
                                            <span className="font-medium">{item.qty || '—'}</span>
                                            {item.unit && <span className="text-muted-foreground ml-1">{item.unit}</span>}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </>
                        )}

                        {/* Documents */}
                        {rfq.documents && rfq.documents.length > 0 && (
                            <>
                                <TableRow className="bg-muted/50">
                                    <TableCell colSpan={4} className="font-semibold text-sm">
                                        Documents ({rfq.documents.length})
                                    </TableCell>
                                </TableRow>
                                {rfq.documents.map((doc) => (
                                    <TableRow key={doc.id} className="hover:bg-muted/30 transition-colors">
                                        <TableCell className="text-sm" colSpan={2}>
                                            <span className="text-xs text-muted-foreground font-mono break-all">
                                                {doc.docType.split('_')}
                                            </span>
                                        </TableCell>
                                        <TableCell className="text-sm font-medium text-muted-foreground">
                                            {doc.path.split("\\").pop()}
                                        </TableCell>
                                        <TableCell className="text-sm text-right">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => window.open("/uploads/tendering/" + doc.path, '_blank')}
                                            >
                                                <ExternalLink className="h-4 w-4 mr-1" />
                                                View
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </>
                        )}

                        {/* Additional Information */}
                        {rfq.docList && (
                            <>
                                <TableRow className="bg-muted/50">
                                    <TableCell colSpan={4} className="font-semibold text-sm">
                                        Additional Information
                                    </TableCell>
                                </TableRow>
                                <TableRow className="hover:bg-muted/30 transition-colors">
                                    <TableCell className="text-sm font-medium text-muted-foreground align-top">
                                        Other Documents Needed
                                    </TableCell>
                                    <TableCell className="text-sm" colSpan={3}>
                                        <p className="whitespace-pre-wrap">{rfq.docList}</p>
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
