import { useParams } from 'react-router-dom';
import SubmitBidForm from './components/SubmitBidForm';
import { useTender } from '@/hooks/api/useTenders';
import { useCostingSheetByTender } from '@/hooks/api/useCostingSheets';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';

export default function BidSubmitPage() {
    const { tenderId } = useParams<{ tenderId: string }>();
    const { data: tenderDetails, isLoading: tenderLoading } = useTender(Number(tenderId));
    const { data: costingSheet, isLoading: costingLoading } = useCostingSheetByTender(Number(tenderId));

    if (tenderLoading || costingLoading) return <Skeleton className="h-[800px]" />;

    if (!tenderDetails) return <div>Tender not found</div>;

    if (!costingSheet || costingSheet.status !== 'Approved') {
        return (
            <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                    This tender does not have an approved costing sheet. Please get the costing approved first.
                </AlertDescription>
            </Alert>
        );
    }

    return (
        <SubmitBidForm
            tenderId={Number(tenderId)}
            tenderDetails={{
                tenderNo: tenderDetails.tenderNo,
                tenderName: tenderDetails.tenderName,
                dueDate: tenderDetails.dueDate as Date,
                teamMemberName: tenderDetails.teamMemberName as string,
                emdAmount: tenderDetails.emd,
                gstValues: Number(tenderDetails.gstValues) || 0,
                finalCosting: costingSheet.finalPrice,
            }}
            mode="submit"
        />
    );
}
