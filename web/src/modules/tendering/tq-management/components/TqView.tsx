import { Card, CardAction, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Pencil, ArrowLeft, FileText, Download, ExternalLink, AlertCircle } from 'lucide-react';
import type { TenderQuery, TenderQueryItem } from '../helpers/tqManagement.types';
import type { TqType } from '@/types/api.types';
import { formatDateTime } from '@/hooks/useFormatedDate';
import { tenderFilesService } from '@/services/api/tender-files.service';

interface TqViewProps {
    tqData?: TenderQuery | null;
    tqItems?: TenderQueryItem[] | null;
    tqTypes?: TqType[] | null;
    isLoading?: boolean;
    showEditButton?: boolean;
    showBackButton?: boolean;
    onEdit?: () => void;
    onBack?: () => void;
    className?: string;
}

export function TqView({
    tqData,
    tqItems,
    tqTypes,
    isLoading = false,
    showEditButton = true,
    showBackButton = true,
    onEdit,
    onBack,
    className = '',
}: TqViewProps) {
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

    if (!tqData) {
        return (
            <Card className={className}>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <FileText className="h-5 w-5" />
                        TQ Management
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="text-center py-8 text-muted-foreground">
                        No TQ data available for this tender yet.
                    </div>
                </CardContent>
            </Card>
        );
    }

    const getStatusVariant = (status: string) => {
        switch (status) {
            case 'TQ awaited':
                return 'secondary';
            case 'TQ received':
                return 'default';
            case 'TQ replied':
                return 'default';
            case 'Disqualified, TQ missed':
                return 'destructive';
            case 'Qualified, No TQ received':
                return 'outline';
            case 'Disqualified, No TQ received':
                return 'destructive';
            case 'TQ replied, Qualified':
                return 'default';
            default:
                return 'secondary';
        }
    };

    const getTqTypeName = (tqTypeId: number) => {
        return tqTypes?.find(t => t.id === tqTypeId)?.name || 'Unknown';
    };

    // Helper function to get file URL from stored path
    const getFileUrl = (filePath: string): string => {
        // File paths may be stored as:
        // 1. "context/filename.ext" (e.g., "tq-management/file.pdf")
        // 2. Just "filename.ext" (need to prepend context)
        const parts = filePath.split('/');
        let context = 'tq-management';
        let fileName = filePath;

        if (parts.length >= 2 && parts[0] === 'tq-management') {
            // Path already includes context
            fileName = parts.slice(1).join('/');
        } else {
            // Path is just filename, prepend context
            fileName = filePath;
        }

        // Get base URL from axios instance
        const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1';
        return `${baseUrl}/tender-files/serve/${context}/${encodeURIComponent(fileName)}`;
    };

    return (
        <Card className={className}>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    TQ Details
                </CardTitle>
                <CardAction className="flex gap-2">
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
            <CardContent className="space-y-8">
                {/* Status Badge */}
                <div className="flex items-center gap-3">
                    <Badge variant={getStatusVariant(tqData.status) as any}>
                        {tqData.status}
                    </Badge>
                </div>

                {/* TQ Received Details */}
                {tqData.status !== 'Qualified, No TQ received' && tqData.status !== 'Disqualified, No TQ received' && (
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
                                            href={getFileUrl(tqData.tqDocumentReceived)}
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
                                            href={getFileUrl(tqData.repliedDocument)}
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
                                            href={getFileUrl(tqData.proofOfSubmission)}
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
                {tqData.status === 'Disqualified, TQ missed' && (
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
                {(tqData.status === 'Qualified, No TQ received' || tqData.status === 'Disqualified, No TQ received') && (
                    <div className="space-y-4">
                        <Alert>
                            <AlertCircle className="h-4 w-4" />
                            <AlertDescription>
                                This tender was qualified without any technical queries.
                            </AlertDescription>
                        </Alert>
                    </div>
                )}

                {/* Timeline */}
                <div className="space-y-4">
                    <h4 className="font-semibold text-base text-primary border-b pb-2">
                        Timeline
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
            </CardContent>
        </Card>
    );
}
