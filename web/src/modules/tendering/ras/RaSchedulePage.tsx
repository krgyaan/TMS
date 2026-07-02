import { useParams, useNavigate } from 'react-router-dom';
import RaScheduleFormPage from './components/RaScheduleFormPage';
import { useTender } from '@/hooks/api/useTenders';
import { useBidSubmissionByTender } from '@/hooks/api/useBidSubmissions';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { paths } from '@/app/routes/paths';

export default function RaSchedulePage() {
    const { tenderId } = useParams<{ tenderId: string }>();
    const navigate = useNavigate();
    const tenderIdNum = Number(tenderId);

    const { data: tenderDetails, isLoading: tenderLoading } = useTender(tenderIdNum);
    const { data: bidSubmission, isLoading: bidLoading } = useBidSubmissionByTender(tenderIdNum);

    if (!tenderDetails) {
        return (
            <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                    Tender not found.
                    <Button variant="outline" onClick={() => navigate(paths.tendering.ras)} className="ml-4">
                        Back to List
                    </Button>
                </AlertDescription>
            </Alert>
        );
    }

    if (!bidSubmission) {
        return (
            <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                    This tender does not have a bid submission. Please submit the bid first.
                    <Button variant="outline" onClick={() => navigate(paths.tendering.ras)} className="ml-4">
                        Back to List
                    </Button>
                </AlertDescription>
            </Alert>
        );
    }

    if (tenderLoading || bidLoading) {
        return <Skeleton className="h-[800px]" />;
    }

    return (
        <RaScheduleFormPage
            tenderId={tenderIdNum}
            tenderDetails={{
                tenderNo: tenderDetails.tenderNo,
                tenderName: tenderDetails.tenderName,
            }}
            onSuccess={() => navigate(paths.tendering.ras)}
        />
    );
}
