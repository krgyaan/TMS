import { useParams } from 'react-router-dom';
import TqReceivedForm from './components/TqReceivedForm';
import { useTender } from '@/hooks/api/useTenders';
import { useTqById } from '@/hooks/api/useTqManagement';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';

export default function TqEditReceivedPage() {
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
                    This TQ is not in received status. Only received TQs can be edited here.
                </AlertDescription>
            </Alert>
        );
    }

    return (
        <TqReceivedForm
            tenderId={tqData.tenderId}
            tenderDetails={{
                tenderNo: tenderDetails.tenderNo,
                tenderName: tenderDetails.tenderName,
                dueDate: tenderDetails.dueDate as Date,
                teamMemberName: tenderDetails.teamMemberName as string,
            }}
            mode="edit"
            existingData={tqData}
        />
    );
}
