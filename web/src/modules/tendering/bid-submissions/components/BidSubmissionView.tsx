import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableRow, TableCell } from '@/components/ui/table';
import { FileText, ExternalLink, Download } from 'lucide-react';
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

    if (!bidSubmission) {
        return (
            <Card className={className}>
                <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        Bid Submission
                    </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                    <div className="flex flex-col items-center justify-center py-6 text-muted-foreground">
                        <FileText className="h-8 w-8 mb-2 opacity-50" />
                        <p className="text-sm">No bid submission available for this tender yet.</p>
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
                                        <TableRow>
                                            <TableCell colSpan={4} className="p-4">
                                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                                                    {bidSubmission.documents.submittedDocs?.map((doc, idx) => (
                                                        <div key={`submitted-${idx}`} className="flex flex-col border rounded-md p-3 bg-card shadow-sm gap-2">
                                                            <div className="flex items-start gap-2 overflow-hidden">
                                                                <FileText className="h-6 w-6 text-muted-foreground shrink-0" />
                                                                <div className="flex flex-col overflow-hidden">
                                                                    <span className="font-medium text-sm truncate" title={doc.split('/').pop() || doc}>
                                                                        {doc.split('/').pop() || doc}
                                                                    </span>
                                                                    <span className="text-xs text-muted-foreground truncate" title={`Submitted Document ${idx + 1}`}>
                                                                        Submitted Document {idx + 1}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                            <div className="flex items-center gap-2 mt-auto">
                                                                <Button
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    className="flex-1 h-8 text-xs gap-1"
                                                                    onClick={() => window.open(getFileUrl(doc), '_blank')}
                                                                >
                                                                    <ExternalLink className="h-3 w-3" />
                                                                </Button>
                                                                <Button
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    className="flex-1 h-8 text-xs gap-1"
                                                                    onClick={() => {
                                                                        const a = document.createElement('a');
                                                                        a.href = getFileUrl(doc);
                                                                        a.download = doc.split('/').pop() || doc;
                                                                        a.click();
                                                                    }}
                                                                >
                                                                    <Download className="h-3 w-3" />
                                                                </Button>
                                                            </div>
                                                        </div>
                                                    ))}
                                                    {bidSubmission.documents.submissionProof && (
                                                        <div className="flex flex-col border rounded-md p-3 bg-card shadow-sm gap-2">
                                                            <div className="flex items-start gap-2 overflow-hidden">
                                                                <FileText className="h-6 w-6 text-muted-foreground shrink-0" />
                                                                <div className="flex flex-col overflow-hidden">
                                                                    <span className="font-medium text-sm truncate" title={bidSubmission.documents.submissionProof.split('/').pop() || bidSubmission.documents.submissionProof}>
                                                                        {bidSubmission.documents.submissionProof.split('/').pop() || bidSubmission.documents.submissionProof}
                                                                    </span>
                                                                    <span className="text-xs text-muted-foreground truncate" title="Submission Proof">
                                                                        Submission Proof
                                                                    </span>
                                                                </div>
                                                            </div>
                                                            <div className="flex items-center gap-2 mt-auto">
                                                                <Button
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    className="flex-1 h-8 text-xs gap-1"
                                                                    onClick={() => window.open(getFileUrl(bidSubmission.documents!.submissionProof!), '_blank')}
                                                                >
                                                                    <ExternalLink className="h-3 w-3" />
                                                                </Button>
                                                                <Button
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    className="flex-1 h-8 text-xs gap-1"
                                                                    onClick={() => {
                                                                        const a = document.createElement('a');
                                                                        a.href = getFileUrl(bidSubmission.documents!.submissionProof!);
                                                                        a.download = bidSubmission.documents!.submissionProof!.split('/').pop() || bidSubmission.documents!.submissionProof!;
                                                                        a.click();
                                                                    }}
                                                                >
                                                                    <Download className="h-3 w-3" />
                                                                </Button>
                                                            </div>
                                                        </div>
                                                    )}
                                                    {bidSubmission.documents.finalPriceSs && (
                                                        <div className="flex flex-col border rounded-md p-3 bg-card shadow-sm gap-2">
                                                            <div className="flex items-start gap-2 overflow-hidden">
                                                                <FileText className="h-6 w-6 text-muted-foreground shrink-0" />
                                                                <div className="flex flex-col overflow-hidden">
                                                                    <span className="font-medium text-sm truncate" title={bidSubmission.documents.finalPriceSs.split('/').pop() || bidSubmission.documents.finalPriceSs}>
                                                                        {bidSubmission.documents.finalPriceSs.split('/').pop() || bidSubmission.documents.finalPriceSs}
                                                                    </span>
                                                                    <span className="text-xs text-muted-foreground truncate" title="Final Price Screenshot">
                                                                        Final Price Screenshot
                                                                    </span>
                                                                </div>
                                                            </div>
                                                            <div className="flex items-center gap-2 mt-auto">
                                                                <Button
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    className="flex-1 h-8 text-xs gap-1"
                                                                    onClick={() => window.open(getFileUrl(bidSubmission.documents!.finalPriceSs!), '_blank')}
                                                                >
                                                                    <ExternalLink className="h-3 w-3" />
                                                                </Button>
                                                                <Button
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    className="flex-1 h-8 text-xs gap-1"
                                                                    onClick={() => {
                                                                        const a = document.createElement('a');
                                                                        a.href = getFileUrl(bidSubmission.documents!.finalPriceSs!);
                                                                        a.download = bidSubmission.documents!.finalPriceSs!.split('/').pop() || bidSubmission.documents!.finalPriceSs!;
                                                                        a.click();
                                                                    }}
                                                                >
                                                                    <Download className="h-3 w-3" />
                                                                </Button>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </TableCell>
                                        </TableRow>
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
