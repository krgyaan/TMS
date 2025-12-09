import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardAction } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, ArrowLeft, Download, ExternalLink } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useTqById, useTqItems } from '@/hooks/api/useTqManagement';
import { useTender } from '@/hooks/api/useTenders';
import { useTqTypes } from '@/hooks/api/useTqTypes';
import { formatDateTime } from '@/hooks/useFormatedDate';
import { paths } from '@/app/routes/paths';

export default function TqViewPage() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { data: tqData, isLoading: tqLoading, error: tqError } = useTqById(Number(id));
    const { data: tenderDetails, isLoading: tenderLoading } = useTender(Number(tqData?.tenderId));
    const { data: tqItems, isLoading: itemsLoading } = useTqItems(Number(id));
    const { data: tqTypes } = useTqTypes();

    if (tqLoading || tenderLoading || itemsLoading) return <Skeleton className="h-[800px]" />;

    if (tqError) {
        return (
            <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                    Failed to load TQ details. Please try again later.
                </AlertDescription>
            </Alert>
        );
    }

    if (!tqData || !tenderDetails) return <div>TQ not found</div>;

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

    const getTqTypeName = (tqTypeId: number) => {
        return tqTypes?.find(t => t.id === tqTypeId)?.name || 'Unknown';
    };

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <div className="flex items-center gap-3">
                            <CardTitle>TQ Details</CardTitle>
                            <Badge variant={getStatusVariant(tqData.status)}>
                                {tqData.status}
                            </Badge>
                        </div>
                        <CardDescription className="mt-2">
                            View detailed information about this technical query
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

                {/* TQ Received Details */}
                {tqData.status !== 'No TQ' && (
                    <div className="space-y-4">
                        <h4 className="font-semibold text-base text-primary border-b pb-2">
                            TQ Received Details
                        </h4>
                        <div className="grid gap-4 md:grid-cols-2 bg-blue-50 dark:bg-blue-950/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">TQ Submission Deadline</p>
                                <p className="text-base font-semibold text-blue-700 dark:text-blue-300">
                                    {tqData.tqSubmissionDeadline
                                        ? formatDateTime(tqData.tqSubmissionDeadline)
                                        : '—'}
                                </p>
                            </div>
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">Received At</p>
                                <p className="text-base font-semibold text-blue-700 dark:text-blue-300">
                                    {tqData.receivedAt
                                        ? formatDateTime(tqData.receivedAt)
                                        : '—'}
                                </p>
                            </div>
                            {tqData.tqDocumentReceived && (
                                <div className="md:col-span-2">
                                    <p className="text-sm font-medium text-muted-foreground mb-2">TQ Document</p>
                                    <div className="flex items-center gap-2 bg-white dark:bg-gray-800 p-2 rounded border">
                                        <Download className="h-4 w-4 text-muted-foreground" />
                                        <span className="text-sm flex-1">{tqData.tqDocumentReceived}</span>
                                        <a
                                            href={tqData.tqDocumentReceived}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-primary hover:underline text-sm"
                                        >
                                            <ExternalLink className="h-4 w-4" />
                                        </a>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* TQ Items */}
                        {tqItems && tqItems.length > 0 && (
                            <div className="space-y-4">
                                <h5 className="font-semibold text-sm text-blue-700 dark:text-blue-300">
                                    Technical Queries ({tqItems.length})
                                </h5>
                                <div className="border rounded-lg overflow-hidden">
                                    <table className="w-full">
                                        <thead className="bg-muted">
                                            <tr>
                                                <th className="px-4 py-3 text-left text-sm font-semibold w-20">Sr. No.</th>
                                                <th className="px-4 py-3 text-left text-sm font-semibold">TQ Type</th>
                                                <th className="px-4 py-3 text-left text-sm font-semibold">Query Description</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y">
                                            {tqItems.map((item) => (
                                                <tr key={item.id} className="hover:bg-muted/30">
                                                    <td className="px-4 py-3 text-sm font-medium">{item.srNo}</td>
                                                    <td className="px-4 py-3 text-sm">
                                                        <Badge variant="outline">{getTqTypeName(item.tqTypeId)}</Badge>
                                                    </td>
                                                    <td className="px-4 py-3 text-sm whitespace-pre-wrap">
                                                        {item.queryDescription}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* TQ Replied Details */}
                {tqData.status === 'TQ replied' && (
                    <div className="space-y-4">
                        <h4 className="font-semibold text-base text-primary border-b pb-2">
                            TQ Reply Details
                        </h4>
                        <div className="grid gap-4 md:grid-cols-2 bg-green-50 dark:bg-green-950/20 p-4 rounded-lg border border-green-200 dark:border-green-800">
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">Reply Date & Time</p>
                                <p className="text-base font-semibold text-green-700 dark:text-green-300">
                                    {tqData.repliedDatetime
                                        ? formatDateTime(tqData.repliedDatetime)
                                        : '—'}
                                </p>
                            </div>
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">Replied At</p>
                                <p className="text-base font-semibold text-green-700 dark:text-green-300">
                                    {tqData.repliedAt
                                        ? formatDateTime(tqData.repliedAt)
                                        : '—'}
                                </p>
                            </div>
                            {tqData.repliedDocument && (
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground mb-2">Reply Documents</p>
                                    <div className="flex items-center gap-2 bg-white dark:bg-gray-800 p-2 rounded border">
                                        <Download className="h-4 w-4 text-muted-foreground" />
                                        <span className="text-sm flex-1">{tqData.repliedDocument}</span>
                                        <a
                                            href={tqData.repliedDocument}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-primary hover:underline text-sm"
                                        >
                                            <ExternalLink className="h-4 w-4" />
                                        </a>
                                    </div>
                                </div>
                            )}
                            {tqData.proofOfSubmission && (
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground mb-2">Proof of Submission</p>
                                    <div className="flex items-center gap-2 bg-white dark:bg-gray-800 p-2 rounded border">
                                        <Download className="h-4 w-4 text-muted-foreground" />
                                        <span className="text-sm flex-1">{tqData.proofOfSubmission}</span>
                                        <a
                                            href={tqData.proofOfSubmission}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-primary hover:underline text-sm"
                                        >
                                            <ExternalLink className="h-4 w-4" />
                                        </a>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* TQ Missed Details */}
                {tqData.status === 'TQ missed' && (
                    <div className="space-y-4">
                        <h4 className="font-semibold text-base text-destructive border-b pb-2">
                            Missed TQ Analysis
                        </h4>
                        <div className="space-y-4 bg-red-50 dark:bg-red-950/20 p-4 rounded-lg border border-red-200 dark:border-red-800">
                            <div>
                                <p className="text-sm font-medium text-muted-foreground mb-2">Reason for Missing</p>
                                <p className="text-sm text-destructive whitespace-pre-wrap">
                                    {tqData.missedReason || '—'}
                                </p>
                            </div>
                            <div>
                                <p className="text-sm font-medium text-muted-foreground mb-2">Prevention Measures</p>
                                <p className="text-sm text-destructive whitespace-pre-wrap">
                                    {tqData.preventionMeasures || '—'}
                                </p>
                            </div>
                            <div>
                                <p className="text-sm font-medium text-muted-foreground mb-2">TMS Improvements Needed</p>
                                <p className="text-sm text-destructive whitespace-pre-wrap">
                                    {tqData.tmsImprovements || '—'}
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {/* No TQ */}
                {tqData.status === 'No TQ' && (
                    <div className="space-y-4">
                        <Alert>
                            <AlertCircle className="h-4 w-4" />
                            <AlertDescription>
                                This tender was qualified without any technical queries.
                            </AlertDescription>
                        </Alert>
                    </div>
                )}

                {/* Metadata */}
                <div className="space-y-4">
                    <h4 className="font-semibold text-base text-primary border-b pb-2">
                        Metadata
                    </h4>
                    <div className="grid gap-4 md:grid-cols-2 bg-muted/30 p-4 rounded-lg">
                        <div>
                            <p className="text-sm font-medium text-muted-foreground">Created At</p>
                            <p className="text-sm">{formatDateTime(tqData.createdAt)}</p>
                        </div>
                        <div>
                            <p className="text-sm font-medium text-muted-foreground">Last Updated</p>
                            <p className="text-sm">{formatDateTime(tqData.updatedAt)}</p>
                        </div>
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="flex justify-end gap-2 pt-6 border-t">
                    <Button variant="outline" onClick={() => navigate(paths.tendering.tqManagement)}>
                        Back to List
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}
