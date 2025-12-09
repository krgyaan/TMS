import { useNavigate, useParams } from 'react-router-dom';
import { useTender } from '@/hooks/api/useTenders';
import { Skeleton } from '@/components/ui/skeleton';
import DocumentChecklistForm from './components/DocumentChecklistForm';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function DocumentChecklistCreatePage() {
    const navigate = useNavigate();
    const { tenderId } = useParams<{ tenderId: string }>();
    const { data: tenderDetails, isLoading } = useTender(Number(tenderId));

    if (isLoading) return <Skeleton className="h-[600px]" />;
    if (!tenderDetails) return (
        <Alert variant="destructive">
            <AlertTitle>Tender not found</AlertTitle>
            <AlertDescription>The tender you are looking for does not exist.</AlertDescription>
            <Button variant="outline" onClick={() => navigate(-1)}>
                <ArrowLeft className="mr-2 h-4 w-4" /> Back
            </Button>
        </Alert>
    );

    return (
        <DocumentChecklistForm
            tenderId={Number(tenderId)}
            tenderDetails={{
                tenderNo: tenderDetails.tenderNo,
                tenderName: tenderDetails.tenderName,
                dueDate: tenderDetails.dueDate as Date,
                teamMemberName: tenderDetails.teamMemberName as string,
            }}
            mode="create"
        />
    );
}
