import { useParams } from 'react-router-dom';
import SubmitBidForm from './components/SubmitBidForm';
import { useTender } from '@/hooks/api/useTenders';
import { useCostingSheetByTender } from '@/hooks/api/useCostingSheets';
import { useBidSubmissionById } from '@/hooks/api/useBidSubmissions';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';

export default function BidEditPage() {
    const { id } = useParams<{ id: string }>();
    const { data: bidSubmission, isLoading: bidLoading } = useBidSubmissionById(Number(id));
    const { data: tenderDetails, isLoading: tenderLoading } = useTender(Number(bidSubmission?.tenderId));
    const { data: costingSheet, isLoading: costingLoading } = useCostingSheetByTender(Number(bidSubmission?.tenderId));

    if (bidLoading || tenderLoading || costingLoading) return <Skeleton className="h-[800px]" />;

    if (!bidSubmission || !tenderDetails) return <div>Bid submission not found</div>;

    if (bidSubmission.status !== 'Bid Submitted') {
        return (
            <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                    This bid is not in submitted status. Only submitted bids can be edited.
                </AlertDescription>
            </Alert>
        );
    }

    return (
        <SubmitBidForm
            tenderId={bidSubmission.tenderId}
            tenderDetails={{
                tenderNo: tenderDetails.tenderNo,
                tenderName: tenderDetails.tenderName,
                dueDate: tenderDetails.dueDate as Date,
                teamMemberName: tenderDetails.teamMemberName as string,
                emdAmount: tenderDetails.emd,
                gstValues: Number(tenderDetails.gstValues) || 0,
                finalCosting: costingSheet?.finalPrice || null,
            }}
            mode="edit"
            existingData={bidSubmission}
        />
    );
}
