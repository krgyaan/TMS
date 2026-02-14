import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, ArrowLeft, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { useRfqResponse } from '@/hooks/api/useRfqs';
import { paths } from '@/app/routes/paths';
import { formatDateTime } from '@/hooks/useFormatedDate';
import { formatINR } from '@/hooks/useINRFormatter';

export default function RfqResponseShowPage() {
    const { responseId } = useParams<{ responseId: string }>();
    const navigate = useNavigate();
    const responseIdNum = responseId ? Number(responseId) : null;

    const { data: response, isLoading, error } = useRfqResponse(responseIdNum);

    if (!responseId) {
        return (
            <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>Invalid response ID.</AlertDescription>
            </Alert>
        );
    }

    if (isLoading) {
        return (
            <Card>
                <CardHeader>
                    <Skeleton className="h-8 w-48" />
                </CardHeader>
                <CardContent className="space-y-4">
                    <Skeleton className="h-32 w-full" />
                    <Skeleton className="h-64 w-full" />
                </CardContent>
            </Card>
        );
    }

    if (error || !response) {
        return (
            <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                    Failed to load response details. It may not exist or you may not have access.
                </AlertDescription>
            </Alert>
        );
    }

    const backToList = () => {
        navigate(paths.tendering.rfqsResponseList(response.rfqId));
    };

    const rfq = response.rfq;

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-2">
                <Button variant="outline" onClick={backToList}>
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back to responses
                </Button>
                <Button variant="ghost" onClick={() => navigate(paths.tendering.rfqsResponses)}>
                    All responses
                </Button>
            </div>

            {rfq && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <FileText className="h-5 w-5" />
                            RFQ (parent)
                        </CardTitle>
                        <p className="text-sm text-muted-foreground mt-1">
                            RFQ ID: {rfq.id} · Tender ID: {rfq.tenderId}
                        </p>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">Due date</p>
                                <p className="text-sm">
                                    {rfq.dueDate ? formatDateTime(String(rfq.dueDate)) : '—'}
                                </p>
                            </div>
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">Requested vendor</p>
                                <p className="text-sm">{rfq.requestedVendor ?? '—'}</p>
                            </div>
                            {rfq.docList && (
                                <div className="sm:col-span-2">
                                    <p className="text-sm font-medium text-muted-foreground">Doc list</p>
                                    <p className="text-sm whitespace-pre-wrap">{rfq.docList}</p>
                                </div>
                            )}
                        </div>
                        {rfq.items && rfq.items.length > 0 && (
                            <div>
                                <p className="text-sm font-medium text-muted-foreground mb-2">RFQ items</p>
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Requirement</TableHead>
                                            <TableHead>Unit</TableHead>
                                            <TableHead>Qty</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {rfq.items.map((item) => (
                                            <TableRow key={item.id}>
                                                <TableCell>{item.requirement}</TableCell>
                                                <TableCell>{item.unit ?? '—'}</TableCell>
                                                <TableCell>{item.qty ?? '—'}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        )}
                        {rfq.documents && rfq.documents.length > 0 && (
                            <div>
                                <p className="text-sm font-medium text-muted-foreground mb-2">RFQ documents</p>
                                <ul className="list-disc list-inside space-y-1 text-sm">
                                    {rfq.documents.map((doc) => (
                                        <li key={doc.id}>
                                            <span className="font-medium">{doc.docType}</span>
                                            {doc.path && (
                                                <span className="text-muted-foreground"> — {doc.path}</span>
                                            )}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}

            <Card>
                <CardHeader>
                    <CardTitle>RFQ Response Details</CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">
                        Vendor: {response.vendorName ?? '—'} · Receipt:{' '}
                        {response.receiptDatetime
                            ? formatDateTime(response.receiptDatetime)
                            : '—'}
                    </p>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div>
                            <p className="text-sm font-medium text-muted-foreground">Vendor</p>
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
