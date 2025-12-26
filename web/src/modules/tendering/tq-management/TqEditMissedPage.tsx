import { useNavigate, useParams } from 'react-router-dom';
import TqMissedForm from './components/TqMissedForm';
import { useTender } from '@/hooks/api/useTenders';
import { useTqById } from '@/hooks/api/useTqManagement';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { paths } from '@/app/routes/paths';

export default function TqEditMissedPage() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { data: tqData, isLoading: tqLoading } = useTqById(Number(id));
    const { data: tenderDetails, isLoading: tenderLoading } = useTender(Number(tqData?.tenderId));

    if (tqLoading || tenderLoading) return <Skeleton className="h-[800px]" />;
    if (!tqData || !tenderDetails) return (
        <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
                TQ not found or failed to load.
            </AlertDescription>
            <Button variant="outline" size="sm" onClick={() => navigate(paths.tendering.tqManagement)}>
                Back to List
            </Button>
        </Alert>
    );

    if (tqData.status !== 'Disqualified, TQ missed') {
        return (
            <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                    This TQ is not in missed status. Only missed TQs can be edited here.
                </AlertDescription>
            </Alert>
        );
    }

    return (
        <TqMissedForm
            tqData={tqData}
            tenderDetails={{
                tenderNo: tenderDetails.tenderNo,
                tenderName: tenderDetails.tenderName,
                dueDate: tenderDetails.dueDate as Date,
                teamMemberName: tenderDetails.teamMemberName as string,
            }}
            mode="edit"
        />
    );
}
