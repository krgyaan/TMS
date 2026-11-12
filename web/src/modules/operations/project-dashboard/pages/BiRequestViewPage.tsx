import { paths } from '@/app/routes/paths';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { usePaymentRequest } from '@/hooks/api/usePaymentRequests';
import { formatINR } from '@/hooks/useINRFormatter';
import { PaymentInstrumentView } from '@/modules/tendering/emds-tenderfees/components/PaymentInstrumentView';
import { AlertCircle, ArrowLeft } from 'lucide-react';
import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';

const DetailField: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
    <div className="space-y-1">
        <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</dt>
        <dd className="text-sm font-medium break-words">{children ?? '-'}</dd>
    </div>
);

export default function BiRequestViewPage() {
    const { projectId, requestId } = useParams<{ projectId: string; requestId: string }>();
    const navigate = useNavigate();
    const id = requestId ? Number(requestId) : null;

    const { data, isLoading, error } = usePaymentRequest(id);

    const goBack = () => {
        const pid = projectId ? Number(projectId) : null;
        if (pid) navigate(paths.operations.projectDashboard(pid));
        else navigate(-1);
    };

    if (!id) {
        return (
            <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>Invalid BI request id.</AlertDescription>
            </Alert>
        );
    }

    if (isLoading) {
        return (
            <Card>
                <CardHeader>
                    <Skeleton className="h-6 w-48" />
                    <Skeleton className="h-4 w-32" />
                </CardHeader>
                <CardContent className="space-y-3">
                    <Skeleton className="h-40 w-full" />
                    <Skeleton className="h-40 w-full" />
                </CardContent>
            </Card>
        );
    }

    if (error || !data) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>BI Request Details</CardTitle>
                    <CardDescription>Could not load this request.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Button variant="outline" size="sm" onClick={goBack}>
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back
                    </Button>
                </CardContent>
            </Card>
        );
    }

    const instrumentType = data.instruments?.[0]?.instrumentType;

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <div className="flex items-start justify-between gap-4">
                        <div>
                            <CardTitle>BI Request Details</CardTitle>
                            <CardDescription>
                                Request #{data.id}
                                {data.type ? ` · ${data.type}` : ''}
                            </CardDescription>
                        </div>
                        <Button variant="outline" size="sm" onClick={goBack}>
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Back to Project
                        </Button>
                    </div>
                </CardHeader>
                <CardContent>
                    <dl className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
                        <DetailField label="Project Name">{data.projectName || '-'}</DetailField>
                        <DetailField label="Work No.">{data.tenderNo || '-'}</DetailField>
                        <DetailField label="Instrument">{instrumentType || '-'}</DetailField>
                        <DetailField label="Purpose">{data.purpose || '-'}</DetailField>
                        <DetailField label="Amount">{formatINR(Number(data.amountRequired || 0))}</DetailField>
                        <DetailField label="Status">
                            <Badge variant="outline">{data.status || 'Pending'}</Badge>
                        </DetailField>
                        <DetailField label="Requested By">{data.requestedByName || '-'}</DetailField>
                        <DetailField label="Created">
                            {data.createdAt ? new Date(data.createdAt).toLocaleString() : '-'}
                        </DetailField>
                    </dl>
                    {data.remarks && (
                        <div className="mt-5 space-y-1">
                            <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Remarks</div>
                            <p className="text-sm">{data.remarks}</p>
                        </div>
                    )}
                </CardContent>
            </Card>

            <PaymentInstrumentView paymentRequestId={id} />
        </div>
    );
}
