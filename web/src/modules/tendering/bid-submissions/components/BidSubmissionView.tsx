import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableRow, TableCell } from '@/components/ui/table';
import { FileText, ExternalLink } from 'lucide-react';
import type { BidSubmission } from '../helpers/bidSubmission.types';
import { formatINR } from '@/hooks/useINRFormatter';
import { formatDateTime } from '@/hooks/useFormatedDate';
import { tenderFilesService } from '@/services/api/tender-files.service';

interface BidSubmissionViewProps {
    bidSubmission?: BidSubmission | null;
    isLoading?: boolean;
    className?: string;
}

export function BidSubmissionView({
    bidSubmission,
    isLoading = false,
    className = '',
}: BidSubmissionViewProps) {
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

    if (!bidSubmission) {
        return (
            <Card className={className}>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <FileText className="h-5 w-5" />
                        Bid Submission
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="text-center py-8 text-muted-foreground">
                        No bid submission available for this tender yet.
                    </div>
                </CardContent>
            </Card>
        );
    }

    const getStatusVariant = (status: string) => {
        switch (status) {
            case 'Bid Submitted':
                return 'default';
            case 'Tender Missed':
                return 'destructive';
            default:
                return 'outline';
        }
    };

    // Helper function to get file URL from stored path
    const getFileUrl = (filePath: string): string => {
        // File paths are stored as "context/filename.ext" (e.g., "bid-submitted-docs/file.pdf")
        // API expects: /tender-files/serve/:context/:fileName
        const parts = filePath.split('/');
        if (parts.length >= 2) {
            const context = parts[0];
            const fileName = parts.slice(1).join('/');
            // Get base URL from axios instance
            const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1';
            return `${baseUrl}/tender-files/serve/${context}/${encodeURIComponent(fileName)}`;
        }
        // Fallback: try to use as-is (shouldn't happen with proper paths)
        return tenderFilesService.getFileUrl(filePath);
    };

    return (
        <Card className={className}>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Bid Submission Details
                </CardTitle>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableBody>
                        {/* Status */}
                        <TableRow className="bg-muted/50">
                            <TableCell colSpan={4} className="font-semibold text-sm">
                                Status
                            </TableCell>
                        </TableRow>
                        <TableRow className="hover:bg-muted/30 transition-colors">
                            <TableCell className="text-sm font-medium text-muted-foreground">
                                Submission Status
                            </TableCell>
                            <TableCell colSpan={3}>
                                <Badge variant={getStatusVariant(bidSubmission.status) as any}>
                                    {bidSubmission.status}
                                </Badge>
                            </TableCell>
                        </TableRow>

                        {/* Bid Submitted Information */}
                        {bidSubmission.status === 'Bid Submitted' && (
                            <>
                                <TableRow className="bg-muted/50">
                                    <TableCell colSpan={4} className="font-semibold text-sm">
                                        Submission Details
                                    </TableCell>
                                </TableRow>
                                <TableRow className="hover:bg-muted/30 transition-colors">
                                    <TableCell className="text-sm font-medium text-muted-foreground">
                                        Submission Date & Time
                                    </TableCell>
                                    <TableCell className="text-sm">
                                        {bidSubmission.submissionDatetime ? formatDateTime(bidSubmission.submissionDatetime) : '—'}
                                    </TableCell>
                                    <TableCell className="text-sm font-medium text-muted-foreground">
                                        Final Bidding Price
                                    </TableCell>
                                    <TableCell className="text-sm font-semibold">
                                        {bidSubmission.finalBiddingPrice ? formatINR(Number(bidSubmission.finalBiddingPrice)) : '—'}
                                    </TableCell>
                                </TableRow>

                                {/* Documents */}
                                {bidSubmission.documents && (
                                    <>
                                        <TableRow className="bg-muted/50">
                                            <TableCell colSpan={4} className="font-semibold text-sm">
                                                Documents
                                            </TableCell>
                                        </TableRow>
                                        {bidSubmission.documents.submittedDocs && bidSubmission.documents.submittedDocs.length > 0 && (
                                            <>
                                                {bidSubmission.documents.submittedDocs.map((doc, idx) => (
                                                    <TableRow key={idx} className="hover:bg-muted/30 transition-colors">
                                                        <TableCell className="text-sm font-medium text-muted-foreground">
                                                            Submitted Document {idx + 1}
                                                        </TableCell>
                                                        <TableCell className="text-sm" colSpan={2}>
                                                            <span className="text-xs text-muted-foreground font-mono break-all">
                                                                {doc}
                                                            </span>
                                                        </TableCell>
                                                        <TableCell className="text-sm text-right">
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick={() => window.open(getFileUrl(doc), '_blank')}
                                                            >
                                                                <ExternalLink className="h-4 w-4 mr-1" />
                                                                View
                                                            </Button>
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </>
                                        )}
                                        {bidSubmission.documents.submissionProof && (
                                            <TableRow className="hover:bg-muted/30 transition-colors">
                                                <TableCell className="text-sm font-medium text-muted-foreground">
                                                    Submission Proof
                                                </TableCell>
                                                <TableCell className="text-sm" colSpan={2}>
                                                    <span className="text-xs text-muted-foreground font-mono break-all">
                                                        {bidSubmission.documents.submissionProof}
                                                    </span>
                                                </TableCell>
                                                <TableCell className="text-sm text-right">
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => window.open(getFileUrl(bidSubmission.documents!.submissionProof!), '_blank')}
                                                    >
                                                        <ExternalLink className="h-4 w-4 mr-1" />
                                                        View
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        )}
                                        {bidSubmission.documents.finalPriceSs && (
                                            <TableRow className="hover:bg-muted/30 transition-colors">
                                                <TableCell className="text-sm font-medium text-muted-foreground">
                                                    Final Price Screenshot
                                                </TableCell>
                                                <TableCell className="text-sm" colSpan={2}>
                                                    <span className="text-xs text-muted-foreground font-mono break-all">
                                                        {bidSubmission.documents.finalPriceSs}
                                                    </span>
                                                </TableCell>
                                                <TableCell className="text-sm text-right">
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => window.open(getFileUrl(bidSubmission.documents!.finalPriceSs!), '_blank')}
                                                    >
                                                        <ExternalLink className="h-4 w-4 mr-1" />
                                                        View
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </>
                                )}
                            </>
                        )}

                        {/* Tender Missed Information */}
                        {bidSubmission.status === 'Tender Missed' && (
                            <>
                                <TableRow className="bg-muted/50">
                                    <TableCell colSpan={4} className="font-semibold text-sm">
                                        Missed Tender Details
                                    </TableCell>
                                </TableRow>
                                <TableRow className="hover:bg-muted/30 transition-colors">
                                    <TableCell className="text-sm font-medium text-muted-foreground">
                                        Reason for Missing
                                    </TableCell>
                                    <TableCell className="text-sm break-words" colSpan={3}>
                                        {bidSubmission.reasonForMissing || '—'}
                                    </TableCell>
                                </TableRow>
                                <TableRow className="hover:bg-muted/30 transition-colors">
                                    <TableCell className="text-sm font-medium text-muted-foreground">
                                        Prevention Measures
                                    </TableCell>
                                    <TableCell className="text-sm break-words" colSpan={3}>
                                        {bidSubmission.preventionMeasures || '—'}
                                    </TableCell>
                                </TableRow>
                                <TableRow className="hover:bg-muted/30 transition-colors">
                                    <TableCell className="text-sm font-medium text-muted-foreground">
                                        TMS Improvements
                                    </TableCell>
                                    <TableCell className="text-sm break-words" colSpan={3}>
                                        {bidSubmission.tmsImprovements || '—'}
                                    </TableCell>
                                </TableRow>
                            </>
                        )}

                        {/* Timeline */}
                        <TableRow className="bg-muted/50">
                            <TableCell colSpan={4} className="font-semibold text-sm">
                                Timeline
                            </TableCell>
                        </TableRow>
                        <TableRow className="hover:bg-muted/30 transition-colors">
                            <TableCell className="text-sm font-medium text-muted-foreground">
                                Created At
                            </TableCell>
                            <TableCell className="text-sm">
                                {formatDateTime(bidSubmission.createdAt)}
                            </TableCell>
                            <TableCell className="text-sm font-medium text-muted-foreground">
                                Last Updated
                            </TableCell>
                            <TableCell className="text-sm">
                                {formatDateTime(bidSubmission.updatedAt)}
                            </TableCell>
                        </TableRow>
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}
