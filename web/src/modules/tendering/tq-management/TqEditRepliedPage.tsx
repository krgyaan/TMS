import { useParams } from 'react-router-dom';
import TqRepliedForm from './components/TqRepliedForm';
import { useTender } from '@/hooks/api/useTenders';
import { useTqById } from '@/hooks/api/useTqManagement';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';

export default function TqEditRepliedPage() {
    const { id } = useParams<{ id: string }>();
    const { data: tqData, isLoading: tqLoading } = useTqById(Number(id));
    const { data: tenderDetails, isLoading: tenderLoading } = useTender(Number(tqData?.tenderId));

    if (tqLoading || tenderLoading) return <Skeleton className="h-[800px]" />;
    if (!tqData || !tenderDetails) return <div>TQ not found</div>;

    if (tqData.status !== 'TQ replied') {
        return (
            <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                    This TQ is not in replied status. Only replied TQs can be edited here.
                </AlertDescription>
            </Alert>
        );
    }

    return (
        <TqRepliedForm
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
