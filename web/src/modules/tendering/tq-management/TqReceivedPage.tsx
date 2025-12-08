import { useParams } from 'react-router-dom';
import TqReceivedForm from './components/TqReceivedForm';
import { useTender } from '@/hooks/api/useTenders';
import { Skeleton } from '@/components/ui/skeleton';

export default function TqReceivedPage() {
    const { tenderId } = useParams<{ tenderId: string }>();
    const { data: tenderDetails, isLoading } = useTender(Number(tenderId));

    if (isLoading) return <Skeleton className="h-[800px]" />;
    if (!tenderDetails) return <div>Tender not found</div>;

    return (
        <TqReceivedForm
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
