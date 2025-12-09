import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardAction } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, ArrowLeft, Download, ExternalLink } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useBidSubmissionById } from '@/hooks/api/useBidSubmissions';
import { useTender } from '@/hooks/api/useTenders';
import { formatDateTime } from '@/hooks/useFormatedDate';
import { formatINR } from '@/hooks/useINRFormatter';
import { paths } from '@/app/routes/paths';

export default function BidSubmissionViewPage() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { data: bidSubmission, isLoading: bidLoading, error: bidError } = useBidSubmissionById(Number(id));
    const { data: tenderDetails, isLoading: tenderLoading } = useTender(Number(bidSubmission?.tenderId));

    if (bidLoading || tenderLoading) return <Skeleton className="h-[800px]" />;

    if (bidError) {
        return (
            <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                    Failed to load bid submission details. Please try again later.
                </AlertDescription>
            </Alert>
        );
    }

    if (!bidSubmission || !tenderDetails) return <div>Bid submission not found</div>;

    const getStatusVariant = (status: string) => {
        switch (status) {
            case 'Submission Pending': return 'secondary';
            case 'Bid Submitted': return 'default';
            case 'Tender Missed': return 'destructive';
            default: return 'secondary';
        }
    };

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <div className="flex items-center gap-3">
                            <CardTitle>Bid Submission Details</CardTitle>
                            <Badge variant={getStatusVariant(bidSubmission.status)}>
                                {bidSubmission.status}
                            </Badge>
                        </div>
                        <CardDescription className="mt-2">
                            View detailed information about this bid submission
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
                        <div>
                            <p className="text-sm font-medium text-muted-foreground">Due Date</p>
                            <p className="text-base font-semibold">
                                {tenderDetails.dueDate ? formatDateTime(tenderDetails.dueDate) : '—'}
                            </p>
                        </div>
                        <div>
                            <p className="text-sm font-medium text-muted-foreground">EMD</p>
                            <p className="text-base font-semibold">
                                {tenderDetails.emd
                                    ? formatINR(parseFloat(tenderDetails.emd))
                                    : '—'}
                            </p>
                        </div>
                        <div>
                            <p className="text-sm font-medium text-muted-foreground">Tender Value</p>
                            <p className="text-base font-semibold">
                                {formatINR(tenderDetails.gstValues || 0)}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Bid Submitted Section */}
                {bidSubmission.status === 'Bid Submitted' && (
                    <div className="space-y-4">
                        <h4 className="font-semibold text-base text-primary border-b pb-2">
                            Bid Submission Details
                        </h4>

                        <div className="grid gap-4 md:grid-cols-2 bg-green-50 dark:bg-green-950/20 p-4 rounded-lg border border-green-200 dark:border-green-800">
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">Submission Date & Time</p>
                                <p className="text-base font-semibold text-green-700 dark:text-green-300">
                                    {bidSubmission.submissionDatetime
                                        ? formatDateTime(bidSubmission.submissionDatetime)
                                        : '—'}
                                </p>
                            </div>

                            <div>
                                <p className="text-sm font-medium text-muted-foreground">Final Bidding Price</p>
                                <p className="text-base font-semibold text-green-700 dark:text-green-300">
                                    {bidSubmission.finalBiddingPrice
                                        ? formatINR(parseFloat(bidSubmission.finalBiddingPrice))
                                        : '—'}
                                </p>
                            </div>

                            <div className="md:col-span-2">
                                <p className="text-sm font-medium text-muted-foreground mb-2">Submitted Documents</p>
                                {bidSubmission.documents?.submittedDocs && bidSubmission.documents.submittedDocs.length > 0 ? (
                                    <div className="space-y-2">
                                        {bidSubmission.documents.submittedDocs.map((doc, index) => (
                                            <div key={index} className="flex items-center gap-2 bg-white dark:bg-gray-800 p-2 rounded border">
                                                <Download className="h-4 w-4 text-muted-foreground" />
                                                <span className="text-sm flex-1">{doc}</span>
                                                <a
                                                    href={doc}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-primary hover:underline text-sm"
                                                >
                                                    <ExternalLink className="h-4 w-4" />
                                                </a>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-sm text-muted-foreground">No documents submitted</p>
                                )}
                            </div>

                            <div>
                                <p className="text-sm font-medium text-muted-foreground mb-2">Proof of Submission</p>
                                {bidSubmission.documents?.submissionProof ? (
                                    <div className="flex items-center gap-2 bg-white dark:bg-gray-800 p-2 rounded border">
                                        <Download className="h-4 w-4 text-muted-foreground" />
                                        <span className="text-sm flex-1">{bidSubmission.documents.submissionProof}</span>
                                        <a
                                            href={bidSubmission.documents.submissionProof}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-primary hover:underline text-sm"
                                        >
                                            <ExternalLink className="h-4 w-4" />
                                        </a>
                                    </div>
                                ) : (
                                    <p className="text-sm text-muted-foreground">—</p>
                                )}
                            </div>

                            <div>
                                <p className="text-sm font-medium text-muted-foreground mb-2">Final Price Screenshot</p>
                                {bidSubmission.documents?.finalPriceSs ? (
                                    <div className="flex items-center gap-2 bg-white dark:bg-gray-800 p-2 rounded border">
                                        <Download className="h-4 w-4 text-muted-foreground" />
                                        <span className="text-sm flex-1">{bidSubmission.documents.finalPriceSs}</span>
                                        <a
                                            href={bidSubmission.documents.finalPriceSs}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-primary hover:underline text-sm"
                                        >
                                            <ExternalLink className="h-4 w-4" />
                                        </a>
                                    </div>
                                ) : (
                                    <p className="text-sm text-muted-foreground">—</p>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* Tender Missed Section */}
                {bidSubmission.status === 'Tender Missed' && (
                    <div className="space-y-4">
                        <h4 className="font-semibold text-base text-destructive border-b pb-2">
                            Missed Tender Analysis
                        </h4>

                        <div className="space-y-4 bg-red-50 dark:bg-red-950/20 p-4 rounded-lg border border-red-200 dark:border-red-800">
                            <div>
                                <p className="text-sm font-medium text-muted-foreground mb-2">Reason for Missing</p>
                                <p className="text-sm text-destructive whitespace-pre-wrap">
                                    {bidSubmission.reasonForMissing || '—'}
                                </p>
                            </div>

                            <div>
                                <p className="text-sm font-medium text-muted-foreground mb-2">Prevention Measures</p>
                                <p className="text-sm text-destructive whitespace-pre-wrap">
                                    {bidSubmission.preventionMeasures || '—'}
                                </p>
                            </div>

                            <div>
                                <p className="text-sm font-medium text-muted-foreground mb-2">TMS Improvements Needed</p>
                                <p className="text-sm text-destructive whitespace-pre-wrap">
                                    {bidSubmission.tmsImprovements || '—'}
                                </p>
                            </div>
                        </div>
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
                            <p className="text-sm">
                                {formatDateTime(bidSubmission.createdAt)}
                            </p>
                        </div>
                        <div>
                            <p className="text-sm font-medium text-muted-foreground">Last Updated</p>
                            <p className="text-sm">
                                {formatDateTime(bidSubmission.updatedAt)}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="flex justify-end gap-2 pt-6 border-t">
                    <Button variant="outline" onClick={() => navigate(paths.tendering.bidSubmissions)}>
                        Back to List
                    </Button>
                    {bidSubmission.status === 'Bid Submitted' && (
                        <Button onClick={() => navigate(paths.tendering.bidEdit(bidSubmission.id))}>
                            Edit Bid
                        </Button>
                    )}
                    {bidSubmission.status === 'Tender Missed' && (
                        <Button
                            variant="destructive"
                            onClick={() => navigate(paths.tendering.bidEditMissed(bidSubmission.id))}
                        >
                            Edit Missed Details
                        </Button>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
