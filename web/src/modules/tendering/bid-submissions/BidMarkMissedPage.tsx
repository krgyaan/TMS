import { useParams } from 'react-router-dom';
import MarkAsMissedForm from './components/MarkAsMissedForm';
import { useTender } from '@/hooks/api/useTenders';
import { useCostingSheetByTender } from '@/hooks/api/useCostingSheets';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

export default function BidMarkMissedPage() {
    const { tenderId } = useParams<{ tenderId: string }>();
    const navigate = useNavigate();
    const { data: tenderDetails, isLoading: tenderLoading } = useTender(Number(tenderId));
    const { data: costingSheet, isLoading: costingLoading } = useCostingSheetByTender(Number(tenderId));

    if (tenderLoading || costingLoading) return <Skeleton className="h-[600px]" />;

    if (!tenderDetails) return (
        <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
                Tender not found.
            </AlertDescription>
            <Button variant="outline" onClick={() => navigate(-1)}>
                Back
            </Button>
        </Alert>
    );

    return (
        <MarkAsMissedForm
            tenderId={Number(tenderId)}
            tenderDetails={{
                tenderNo: tenderDetails.tenderNo,
                tenderName: tenderDetails.tenderName,
                dueDate: tenderDetails.dueDate as Date,
                teamMemberName: tenderDetails.teamMemberName as string,
                emdAmount: tenderDetails.emd as string,
                gstValues: Number(tenderDetails.gstValues) || 0,
                finalCosting: costingSheet?.finalPrice || null,
            }}
            mode="missed"
        />
    );
}
