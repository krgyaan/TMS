import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, FileText } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useRfqResponse } from '@/hooks/api/useRfqResponses';
import { formatDateTime } from '@/hooks/useFormatedDate';
import { formatINR } from '@/hooks/useINRFormatter';

interface RfqResponseSectionProps {
    responseId: number;
}

export function RfqResponseSection({ responseId }: RfqResponseSectionProps) {
    const { data: response, isLoading: responseLoading } = useRfqResponse(responseId);

    if (responseLoading) return <Skeleton className="h-64 w-full" />;
    
    if (!response) {
        return (
            <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>Failed to load response details.</AlertDescription>
            </Alert>
        );
    }

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>RFQ Response Details</CardTitle>
                    <div className="text-sm text-muted-foreground mt-1 space-x-2">
                        <span className="font-semibold text-foreground">{response.organizationName ?? '—'}</span>
                        <span>·</span>
                        <span>{response.vendorName ?? '—'}</span>
                        <span>·</span>
                        <span>Receipt: {response.receiptDatetime ? formatDateTime(response.receiptDatetime) : '—'}</span>
                    </div>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div>
                            <p className="text-sm font-medium text-muted-foreground">Organization</p>
                            <p className="text-sm font-semibold">{response.organizationName ?? '—'}</p>
                        </div>
                        <div>
                            <p className="text-sm font-medium text-muted-foreground">Vendor contact</p>
                            <p className="text-sm">{response.vendorName ?? '—'}</p>
                        </div>
                        <div>
                            <p className="text-sm font-medium text-muted-foreground">Receipt date</p>
                            <p className="text-sm">
                                {response.receiptDatetime
                                    ? formatDateTime(response.receiptDatetime)
                                    : '—'}
                            </p>
                        </div>
                        <div>
                            <p className="text-sm font-medium text-muted-foreground">GST %</p>
                            <p className="text-sm">{response.gstPercentage ?? '—'}</p>
                        </div>
                        <div>
                            <p className="text-sm font-medium text-muted-foreground">GST type</p>
                            <p className="text-sm">{response.gstType ?? '—'}</p>
                        </div>
                        <div>
                            <p className="text-sm font-medium text-muted-foreground">Delivery time</p>
                            <p className="text-sm">{response.deliveryTime ?? '—'}</p>
                        </div>
                        <div>
                            <p className="text-sm font-medium text-muted-foreground">Freight type</p>
                            <p className="text-sm">{response.freightType ?? '—'}</p>
                        </div>
                    </div>
                    {response.notes && (
                        <div>
                            <p className="text-sm font-medium text-muted-foreground">Notes</p>
                            <p className="text-sm whitespace-pre-wrap">{response.notes}</p>
                        </div>
                    )}
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Response items</CardTitle>
                </CardHeader>
                <CardContent>
                    {response.items.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No items recorded.</p>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Requirement</TableHead>
                                    <TableHead>Unit</TableHead>
                                    <TableHead>Qty</TableHead>
                                    <TableHead className="text-right">Unit price</TableHead>
                                    <TableHead className="text-right">Total price</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {response.items.map((item) => (
                                    <TableRow key={item.id}>
                                        <TableCell>{item.requirement}</TableCell>
                                        <TableCell>{item.unit ?? '—'}</TableCell>
                                        <TableCell>{item.qty ?? '—'}</TableCell>
                                        <TableCell className="text-right">
                                            {item.unitPrice != null
                                                ? formatINR(parseFloat(item.unitPrice))
                                                : '—'}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            {item.totalPrice != null
                                                ? formatINR(parseFloat(item.totalPrice))
                                                : '—'}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>

            {response.documents.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <FileText className="h-5 w-5" />
                            Documents
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ul className="list-disc list-inside space-y-1 text-sm">
                            {response.documents.map((doc) => (
                                <li key={doc.id}>
                                    <span className="font-medium">{doc.docType}</span>
                                    {doc.path && (
                                        <span className="text-muted-foreground"> — {doc.path}</span>
                                    )}
                                </li>
                            ))}
                        </ul>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
