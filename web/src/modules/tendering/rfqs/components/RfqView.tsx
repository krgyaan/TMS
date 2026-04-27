import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableRow, TableCell } from '@/components/ui/table';
import { FileText, ExternalLink, Download } from 'lucide-react';
import type { Rfq } from '../helpers/rfq.types';
import type { TenderInfoWithNames } from '@/modules/tendering/tenders/helpers/tenderInfo.types';
import { formatDateTime } from '@/hooks/useFormatedDate';

interface RfqViewProps {
    rfq: Rfq | null;
    tender?: TenderInfoWithNames;
    isLoading?: boolean;
    className?: string;
}

export function RfqView({
    rfq,
    isLoading = false,
    className = '',
}: RfqViewProps) {
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

    if (!rfq) {
        return (
            <Card className={className}>
                <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        RFQ
                    </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                    <div className="flex flex-col items-center justify-center py-6 text-muted-foreground">
                        <FileText className="h-8 w-8 mb-2 opacity-50" />
                        <p className="text-sm">No RFQ available for this tender yet.</p>
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className={className}>

            <CardContent className="p-2">
                <Table>
                    <TableBody>
                        {/* RFQ Information */}
                        <TableRow className="bg-muted/40 h-8">
                            <TableCell colSpan={4} className="font-bold text-[11px] uppercase tracking-wider py-1 px-3">
                                RFQ Information
                            </TableCell>
                        </TableRow>
                        <TableRow className="hover:bg-muted/30 transition-colors h-8">
                            <TableCell className="text-xs font-medium text-muted-foreground w-1/4 py-1 px-3">
                                RFQ ID
                            </TableCell>
                            <TableCell className="text-xs font-semibold w-1/4 py-1 px-3">
                                #{rfq.id}
                            </TableCell>
                            <TableCell className="text-xs font-medium text-muted-foreground w-1/4 py-1 px-3">
                                Due Date & Time
                            </TableCell>
                            <TableCell className="text-xs w-1/4 py-1 px-3">
                                {rfq.dueDate ? formatDateTime(rfq.dueDate) : '—'}
                            </TableCell>
                        </TableRow>
                        <TableRow className="hover:bg-muted/30 transition-colors">
                            <TableCell className="text-xs font-medium text-muted-foreground align-top w-1/4 py-1 px-3">
                                Requested Details
                            </TableCell>
                            <TableCell className="text-sm" colSpan={3}>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {rfq.requestedGroups && rfq.requestedGroups.length > 0 ? (
                                        rfq.requestedGroups.map((group) => (
                                            <div key={group.organizationId} className="border rounded-md p-3 bg-muted/20">
                                                <p className="font-semibold text-sm mb-2 border-b pb-1">{group.organizationName}</p>
                                                <div className="space-y-1.5">
                                                    {group.vendors.map(v => (
                                                        <div key={v.id} className="flex flex-col">
                                                            <span className="text-sm font-medium">{v.name}</span>
                                                            <span className="text-xs text-muted-foreground">{v.email}</span>
                                                        </div>
                                                    ))}
                                                    {group.vendors.length === 0 && (
                                                        <span className="text-xs text-muted-foreground italic">No specific vendors requested</span>
                                                    )}
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="flex flex-col gap-2">
                                            <div>
                                                <p className="text-xs font-medium text-muted-foreground">Organisations</p>
                                                <p>{rfq.requestedOrganizationNames.join(', ') || '—'}</p>
                                            </div>
                                            <div>
                                                <p className="text-xs font-medium text-muted-foreground">Vendors</p>
                                                <p>{rfq.requestedVendorNames.join(', ') || '—'}</p>
                                            </div>
                                        </div>
                                    )}
                                </div>
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
                                <TableRow className="bg-muted/40 h-8">
                                    <TableCell colSpan={4} className="font-bold text-[11px] uppercase tracking-wider py-1 px-3">
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
                                        <TableCell className="text-right py-1 px-3">
                                            <span className="font-medium text-xs">{item.qty || '—'}</span>
                                            {item.unit && <span className="text-[10px] text-muted-foreground ml-1">{item.unit}</span>}
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
                                <TableRow>
                                    <TableCell colSpan={4} className="p-2">
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                                            {rfq.documents.map((doc) => (
                                                <div key={doc.id} className="flex items-center justify-between border rounded p-1.5 bg-card hover:bg-muted/50 transition-colors">
                                                    <div className="flex items-center gap-2 overflow-hidden mr-2">
                                                        <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                                                        <span className="text-xs font-medium truncate" title={doc.docType.replace(/_/g, ' ')}>
                                                            {doc.docType.replace(/_/g, ' ')}
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center gap-1 shrink-0">
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-6 w-6"
                                                            onClick={() => window.open("/uploads/tendering/" + doc.path, '_blank')}
                                                        >
                                                            <ExternalLink className="h-3 w-3" />
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-6 w-6"
                                                            onClick={() => {
                                                                const a = document.createElement('a');
                                                                a.href = "/uploads/tendering/" + doc.path;
                                                                a.download = doc.path.split("\\").pop() || doc.docType;
                                                                a.click();
                                                            }}
                                                        >
                                                            <Download className="h-3 w-3" />
                                                        </Button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </TableCell>
                                </TableRow>
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
                                    <TableCell className="text-sm break-words" colSpan={3}>
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
