import { useParams, useNavigate } from 'react-router-dom';
import CostingSheetSubmitForm from './components/CostingSheetSubmitForm';
import { useTender } from '@/hooks/api/useTenders';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

export default function CostingSheetSubmitPage() {
    const navigate = useNavigate();
    const { tenderId } = useParams<{ tenderId: string }>();
    const { data: tenderDetails, isLoading } = useTender(Number(tenderId));

    if (isLoading) return <Skeleton className="h-[600px]" />;
    if (!tenderDetails) return (
        <Alert variant="destructive">
            <AlertTitle>Tender not found</AlertTitle>
            <AlertDescription>The tender with the ID {tenderId} was not found.</AlertDescription>
            <Button variant="outline" onClick={() => navigate(-1)}><ArrowLeft /> Back to Tenders</Button>
        </Alert>
    );

    return (
        <CostingSheetSubmitForm
            tenderId={Number(tenderId)}
            tenderDetails={{
                tenderNo: tenderDetails.tenderNo,
                tenderName: tenderDetails.tenderName,
                dueDate: tenderDetails.dueDate as Date,
                teamMemberName: tenderDetails.teamMemberName as string,
            }}
            mode="submit"
        />
    );
}
