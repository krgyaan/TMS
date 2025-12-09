import { useParams } from 'react-router-dom';
import TqMissedForm from './components/TqMissedForm';
import { useTender } from '@/hooks/api/useTenders';
import { useTqById } from '@/hooks/api/useTqManagement';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';

export default function TqMissedPage() {
    const { id } = useParams<{ id: string }>();
    const { data: tqData, isLoading: tqLoading } = useTqById(Number(id));
    const { data: tenderDetails, isLoading: tenderLoading } = useTender(Number(tqData?.tenderId));

    if (tqLoading || tenderLoading) return <Skeleton className="h-[800px]" />;
    if (!tqData || !tenderDetails) return <div>TQ not found</div>;

    if (tqData.status !== 'TQ received') {
        return (
            <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                    This TQ is not in received status. Only received TQs can be marked as missed.
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
            mode="missed"
        />
    );
}
