import { useParams } from 'react-router-dom';
import MarkAsMissedForm from './components/MarkAsMissedForm';
import { useTender } from '@/hooks/api/useTenders';
import { useCostingSheetByTender } from '@/hooks/api/useCostingSheets';
import { useBidSubmissionById } from '@/hooks/api/useBidSubmissions';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

export default function BidEditMissedPage() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { data: bidSubmission, isLoading: bidLoading } = useBidSubmissionById(Number(id));
    const { data: tenderDetails, isLoading: tenderLoading } = useTender(Number(bidSubmission?.tenderId));
    const { data: costingSheet, isLoading: costingLoading } = useCostingSheetByTender(Number(bidSubmission?.tenderId));

    if (bidLoading || tenderLoading || costingLoading) return <Skeleton className="h-[600px]" />;

    if (!bidSubmission || !tenderDetails) return (
        <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
                Bid submission not found.
            </AlertDescription>
            <Button variant="outline" onClick={() => navigate(-1)}>
                Back
            </Button>
        </Alert>
    );

    if (bidSubmission.status !== 'Tender Missed') {
        return (
            <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                    This tender is not marked as missed. Only missed tenders can be edited here.
                </AlertDescription>
                <Button variant="outline" onClick={() => navigate(-1)}>
                    Back
                </Button>
            </Alert>
        );
    }

    return (
        <MarkAsMissedForm
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
