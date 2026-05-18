import { useNavigate, useParams } from 'react-router-dom';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, CheckCircle2, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { paths } from '@/app/routes/paths';
import { useRfq, useResponseStatus } from '@/hooks/api/useRfqs';
import { useRfqResponses } from '@/hooks/api/useRfqResponses';
import { RfqResponseForm } from './components/RfqResponseForm';

export default function RfqResponseCreatePage() {
    const navigate = useNavigate();
    const { rfqId: rfqIdParam } = useParams<{ rfqId: string }>();

    const rfqId = rfqIdParam ? parseInt(rfqIdParam, 10) : null;
    const { data: rfq, isLoading, error } = useRfq(rfqId);
    const { data: responseStatus } = useResponseStatus();
    const { data: responsesData, isLoading: isResponsesLoading } = useRfqResponses(rfqId);

    //giving all the vendor orgs
    const orgs = rfq?.vendorOrganizations ?? undefined;

    const receivedResponses = responsesData?.allTenderResponses || [];
    const pendingResponses = responsesData?.pendingTenderResponses || [];


    if (!rfqIdParam || Number.isNaN(rfqId!)) {
        return (
            <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>Invalid RFQ ID</AlertDescription>
                <Button variant="outline" size="sm" onClick={() => navigate(paths.tendering.rfqs)}>
                    Go Back
                </Button>
            </Alert>
        );
    }

    if (isLoading) {
        return (
            <Card>
                <CardHeader>
                    <Skeleton className="h-8 w-64" />
                    <Skeleton className="h-4 w-48 mt-2" />
                </CardHeader>
                <CardContent>
                    <Skeleton className="h-[400px] w-full" />
                </CardContent>
            </Card>
        );
    }

    if (error || !rfq) {
        return (
            <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>Failed to load RFQ. Please try again.</AlertDescription>
                <Button variant="outline" size="sm" onClick={() => navigate(paths.tendering.rfqs)}>
                    Go Back
                </Button>
            </Alert>
        );
    }

    const rfqData = {
        ...rfq,
        items: rfq.items ?? [],
        tenderNo: (rfq as any).tenderNo ?? '',
        tenderName: (rfq as any).tenderName ?? '',
    };

    if (!rfqData.items.length) {
        return (
            <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>This RFQ has no items. Add items to the RFQ before recording a response.</AlertDescription>
                <Button variant="outline" size="sm" onClick={() => navigate(paths.tendering.rfqs)}>
                    Go Back
                </Button>
            </Alert>
        );
    }

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader className="pb-3">
                    <h3 className="text-lg font-semibold tracking-tight">Response Status</h3>
                    <p className="text-sm text-muted-foreground">
                        Overview of vendor responses for this tender.
                    </p>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Received Responses */}
                        <div className="border rounded-md p-4 bg-muted/10">
                            <div className="flex items-center justify-between mb-3">
                                <h4 className="text-sm font-semibold flex items-center gap-2">
                                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                                    Responses Received
                                </h4>
                                <Badge variant="secondary" className="bg-green-100 text-green-800 hover:bg-green-100 border-green-200">
                                    {receivedResponses.length}
                                </Badge>
                            </div>
                            {isResponsesLoading ? (
                                <Skeleton className="h-10 w-full" />
                            ) : receivedResponses.length > 0 ? (
                                <div className="space-y-2 max-h-[150px] overflow-y-auto pr-2 custom-scrollbar">
                                    {receivedResponses.map((res: any, idx: number) => (
                                        <div key={idx} className="flex flex-col text-sm border-b last:border-0 pb-2 last:pb-0">
                                            <span className="font-medium text-foreground">{res.organizationName || 'Unknown Organization'}</span>
                                            <span className="text-xs text-muted-foreground">{res.vendorName}</span>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-sm text-muted-foreground italic">No responses received yet.</p>
                            )}
                        </div>

                        {/* Pending Responses */}
                        <div className="border rounded-md p-4 bg-muted/10">
                            <div className="flex items-center justify-between mb-3">
                                <h4 className="text-sm font-semibold flex items-center gap-2">
                                    <Clock className="h-4 w-4 text-amber-500" />
                                    Awaiting Responses
                                </h4>
                                <Badge variant="secondary" className="bg-amber-100 text-amber-800 hover:bg-amber-100 border-amber-200">
                                    {pendingResponses.length}
                                </Badge>
                            </div>
                            {isResponsesLoading ? (
                                <Skeleton className="h-10 w-full" />
                            ) : pendingResponses.length > 0 ? (
                                <div className="space-y-2 max-h-[150px] overflow-y-auto pr-2 custom-scrollbar">
                                    {pendingResponses.map((org: any, idx: number) => (
                                        <div key={idx} className="flex flex-col text-sm border-b last:border-0 pb-2 last:pb-0">
                                            <span className="font-medium text-foreground">{org.organizationName}</span>
                                            <span className="text-xs text-muted-foreground">
                                                {org.vendors?.length ? `${org.vendors.length} vendors requested` : 'No specific vendor'}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-sm text-muted-foreground italic">All requested vendors have responded.</p>
                            )}
                        </div>
                    </div>
                </CardContent>
            </Card>

            <RfqResponseForm
                rfqId={rfqId!}
                rfqData={rfqData}
                orgs={orgs}
                responseStatus={responseStatus}
            />
        </div>
    );
}
