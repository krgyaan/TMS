import { useParams } from 'react-router-dom';
import CostingSheetSubmitForm from './components/CostingSheetSubmitForm';
import { useTender } from '@/hooks/api/useTenders';
import { useCostingSheetByTender } from '@/hooks/api/useCostingSheets';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function CostingSheetResubmitPage() {
    const { tenderId } = useParams<{ tenderId: string }>();
    const navigate = useNavigate();
    const { data: tenderDetails, isLoading: tenderLoading } = useTender(Number(tenderId));
    const { data: costingSheet, isLoading: costingLoading } = useCostingSheetByTender(Number(tenderId));

    if (tenderLoading || costingLoading) return <Skeleton className="h-[600px]" />;
    if (!tenderDetails) return (
        <Alert variant="destructive">
            <AlertTitle>Tender not found</AlertTitle>
            <AlertDescription>The tender with the ID {tenderId} was not found.</AlertDescription>
            <Button variant="outline" onClick={() => navigate(-1)}><ArrowLeft /> Back to Tenders</Button>
        </Alert>
    );

    // Validate costing sheet exists
    if (!costingSheet) {
        return (
            <Alert variant="destructive">
                <AlertTitle>Costing Sheet Not Found</AlertTitle>
                <AlertDescription>
                    No costing sheet exists for this tender. Please submit a costing sheet first.
                </AlertDescription>
                <Button variant="outline" onClick={() => navigate(-1)} className="mt-4">
                    <ArrowLeft className="mr-2 h-4 w-4" /> Back
                </Button>
            </Alert>
        );
    }

    // Validate costing sheet is in Rejected/Redo status (only rejected sheets can be resubmitted)
    if (costingSheet.status !== 'Rejected/Redo') {
        return (
            <Alert variant="destructive">
                <AlertTitle>Cannot Resubmit Costing Sheet</AlertTitle>
                <AlertDescription>
                    Only costing sheets with "Rejected/Redo" status can be resubmitted.
                    Current status: {costingSheet.status || 'Not submitted'}
                </AlertDescription>
                <Button variant="outline" onClick={() => navigate(-1)} className="mt-4">
                    <ArrowLeft className="mr-2 h-4 w-4" /> Back
                </Button>
            </Alert>
        );
    }

    return (
        <CostingSheetSubmitForm
            tenderId={Number(tenderId)}
            tenderDetails={{
                tenderNo: tenderDetails.tenderNo,
                tenderName: tenderDetails.tenderName,
                dueDate: tenderDetails.dueDate as Date,
                teamMemberName: tenderDetails.teamMemberName as string,
            }}
            mode="resubmit"
            existingData={costingSheet}
        />
    );
}
