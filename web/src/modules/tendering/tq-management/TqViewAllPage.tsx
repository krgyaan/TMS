import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardAction } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, ArrowLeft, Eye } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useTqByTender } from '@/hooks/api/useTqManagement';
import { useTender } from '@/hooks/api/useTenders';
import { formatDateTime } from '@/hooks/useFormatedDate';
import { paths } from '@/app/routes/paths';

export default function TqViewAllPage() {
    const { tenderId } = useParams<{ tenderId: string }>();
    const navigate = useNavigate();
    const { data: tqRecords, isLoading: tqLoading, error: tqError } = useTqByTender(Number(tenderId));
    const { data: tenderDetails, isLoading: tenderLoading } = useTender(Number(tenderId));

    if (tqLoading || tenderLoading) return <Skeleton className="h-[600px]" />;

    if (tqError) {
        return (
            <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                    Failed to load TQ records. Please try again later.
                </AlertDescription>
            </Alert>
        );
    }

    if (!tenderDetails) return <div>Tender not found</div>;

    const getStatusVariant = (status: string) => {
        switch (status) {
            case 'TQ awaited': return 'secondary';
            case 'TQ received': return 'default';
            case 'TQ replied': return 'default';
            case 'TQ missed': return 'destructive';
            case 'No TQ': return 'outline';
            default: return 'secondary';
        }
    };

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle>All TQs for Tender</CardTitle>
                        <CardDescription className="mt-2">
                            View all technical query records for this tender
                        </CardDescription>
                    </div>
                    <CardAction>
                        <Button variant="outline" onClick={() => navigate(-1)}>
                            <ArrowLeft className="mr-2 h-4 w-4" /> Back
                        </Button>
                    </CardAction>
                </div>
            </CardHeader>
            <CardContent className="space-y-8">
                {/* Tender Information */}
                <div className="space-y-4">
                    <h4 className="font-semibold text-base text-primary border-b pb-2">
                        Tender Information
                    </h4>
                    <div className="grid gap-4 md:grid-cols-2 bg-muted/30 p-4 rounded-lg">
                        <div>
                            <p className="text-sm font-medium text-muted-foreground">Tender No</p>
                            <p className="text-base font-semibold">{tenderDetails.tenderNo}</p>
                        </div>
                        <div>
                            <p className="text-sm font-medium text-muted-foreground">Team Member</p>
                            <p className="text-base font-semibold">{tenderDetails.teamMemberName || '—'}</p>
                        </div>
                        <div className="md:col-span-2">
                            <p className="text-sm font-medium text-muted-foreground">Tender Name</p>
                            <p className="text-base font-semibold">{tenderDetails.tenderName}</p>
                        </div>
                    </div>
                </div>

                {/* TQ Records */}
                <div className="space-y-4">
                    <h4 className="font-semibold text-base text-primary border-b pb-2">
                        TQ Records ({tqRecords?.length || 0})
                    </h4>

                    {!tqRecords || tqRecords.length === 0 ? (
                        <Alert>
                            <AlertCircle className="h-4 w-4" />
                            <AlertDescription>
                                No TQ records found for this tender.
                            </AlertDescription>
                        </Alert>
                    ) : (
                        <div className="space-y-4">
                            {tqRecords.map((tq, index) => (
                                <div
                                    key={tq.id}
                                    className="border rounded-lg p-4 hover:shadow-md transition-shadow"
                                >
                                    <div className="flex items-start justify-between mb-4">
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <h5 className="font-semibold">TQ #{index + 1}</h5>
                                                <Badge variant={getStatusVariant(tq.status)}>
                                                    {tq.status}
                                                </Badge>
                                            </div>
                                            <p className="text-sm text-muted-foreground mt-1">
                                                Created: {formatDateTime(tq.createdAt)}
                                            </p>
                                        </div>
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => navigate(paths.tendering.tqView(tq.id))}
                                        >
                                            <Eye className="h-4 w-4 mr-2" />
                                            View Details
                                        </Button>
                                    </div>

                                    <div className="grid gap-4 md:grid-cols-2 text-sm">
                                        {tq.tqSubmissionDeadline && (
                                            <div>
                                                <p className="text-muted-foreground">TQ Deadline</p>
                                                <p className="font-medium">
                                                    {formatDateTime(tq.tqSubmissionDeadline)}
                                                </p>
                                            </div>
                                        )}
                                        {tq.receivedAt && (
                                            <div>
                                                <p className="text-muted-foreground">Received At</p>
                                                <p className="font-medium">
                                                    {formatDateTime(tq.receivedAt)}
                                                </p>
                                            </div>
                                        )}
                                        {tq.repliedAt && (
                                            <div>
                                                <p className="text-muted-foreground">Replied At</p>
                                                <p className="font-medium">
                                                    {formatDateTime(tq.repliedAt)}
                                                </p>
                                            </div>
                                        )}
                                        {tq.status === 'TQ missed' && tq.missedReason && (
                                            <div className="md:col-span-2">
                                                <p className="text-muted-foreground">Missed Reason</p>
                                                <p className="font-medium text-destructive line-clamp-2">
                                                    {tq.missedReason}
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Action Buttons */}
                <div className="flex justify-end gap-2 pt-6 border-t">
                    <Button variant="outline" onClick={() => navigate(paths.tendering.tqManagement)}>
                        Back to TQ Management
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}
