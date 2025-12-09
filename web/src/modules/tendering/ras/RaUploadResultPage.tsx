import { useParams, useNavigate } from 'react-router-dom';
import RAResultFormPage from './components/RAResultFormPage';
import { useReverseAuction } from '@/hooks/api/useReverseAuctions';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { paths } from '@/app/routes/paths';

const RA_STATUS = {
    UNDER_EVALUATION: 'Under Evaluation',
    RA_SCHEDULED: 'RA Scheduled',
    DISQUALIFIED: 'Disqualified',
    RA_STARTED: 'RA Started',
    RA_ENDED: 'RA Ended',
    WON: 'Won',
    LOST: 'Lost',
    LOST_H1: 'Lost - H1 Elimination',
} as const;

export default function RaUploadResultPage() {
    const { raId } = useParams<{ raId: string }>();
    const navigate = useNavigate();
    const { data: ra, isLoading, error } = useReverseAuction(Number(raId));

    if (isLoading) return <Skeleton className="h-[800px]" />;

    if (error || !ra) {
        return (
            <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                    RA not found or failed to load.
                    <Button
                        variant="outline"
                        size="sm"
                        className="ml-4"
                        onClick={() => navigate(paths.tendering.ras)}
                    >
                        Back to List
                    </Button>
                </AlertDescription>
            </Alert>
        );
    }

    const raStatus = (ra as any).raStatus || (ra as any).status || RA_STATUS.UNDER_EVALUATION;
    const isScheduledOrActive = [
        RA_STATUS.RA_SCHEDULED,
        RA_STATUS.RA_STARTED,
        RA_STATUS.RA_ENDED,
    ].includes(raStatus as any);

    if (!isScheduledOrActive) {
        return (
            <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                    This RA is not scheduled yet. Please schedule the RA first.
                    <Button
                        variant="outline"
                        size="sm"
                        className="ml-4"
                        onClick={() => navigate(paths.tendering.rasShow(Number(raId)))}
                    >
                        View RA Details
                    </Button>
                </AlertDescription>
            </Alert>
        );
    }

    const tenderDetails = {
        tenderNo: (ra as any).tenderNo || '',
        tenderName: (ra as any).tenderName || '',
    };

    return (
        <RAResultFormPage
            raId={Number(raId)}
            tenderDetails={tenderDetails}
            onSuccess={() => navigate(paths.tendering.rasShow(Number(raId)))}
        />
    );
}
