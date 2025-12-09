import { useParams, useNavigate } from 'react-router-dom';
import { useReverseAuction } from '@/hooks/api/useReverseAuctions';
import RaScheduleFormPage from './components/RaScheduleFormPage';
import RAResultFormPage from './components/RAResultFormPage';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader } from '@/components/ui/card';

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

export default function RaEditPage() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const raId = id ? Number(id) : null;
    const { data: ra, isLoading, error } = useReverseAuction(raId!);

    if (!raId) {
        return (
            <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                    Invalid RA ID.
                    <Button
                        variant="outline"
                        size="sm"
                        className="ml-4"
                        onClick={() => navigate('/tendering/ras')}
                    >
                        Back to List
                    </Button>
                </AlertDescription>
            </Alert>
        );
    }

    if (isLoading) {
        return (
            <Card>
                <CardHeader>
                    <Skeleton className="h-8 w-48" />
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        {Array.from({ length: 8 }).map((_, i) => (
                            <Skeleton key={i} className="h-12 w-full" />
                        ))}
                    </div>
                </CardContent>
            </Card>
        );
    }

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
                        onClick={() => navigate('/tendering/ras')}
                    >
                        Back to List
                    </Button>
                </AlertDescription>
            </Alert>
        );
    }

    const raStatus = (ra as any).raStatus || (ra as any).status || RA_STATUS.UNDER_EVALUATION;
    const tenderDetails = {
        tenderNo: (ra as any).tenderNo || '',
        tenderName: (ra as any).tenderName || '',
    };

    // Determine which form to show based on RA status
    const isUnderEvaluation = raStatus === RA_STATUS.UNDER_EVALUATION;
    const isScheduledOrActive = [
        RA_STATUS.RA_SCHEDULED,
        RA_STATUS.RA_STARTED,
        RA_STATUS.RA_ENDED,
    ].includes(raStatus as any);

    if (isUnderEvaluation) {
        return (
            <RaScheduleFormPage
                raId={raId}
                tenderDetails={tenderDetails}
                onSuccess={() => navigate(`/tendering/ras/${raId}`)}
            />
        );
    }

    if (isScheduledOrActive) {
        return (
            <RAResultFormPage
                raId={raId}
                tenderDetails={tenderDetails}
                onSuccess={() => navigate(`/tendering/ras/${raId}`)}
            />
        );
    }

    // If RA is completed, show a message
    return (
        <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
                This RA has been completed and cannot be edited.
                <Button
                    variant="outline"
                    size="sm"
                    className="ml-4"
                    onClick={() => navigate(`/tendering/ras/${raId}`)}
                >
                    View Details
                </Button>
            </AlertDescription>
        </Alert>
    );
}
