import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { useTqById } from '@/hooks/api/useTqManagement';
import { AlertCircle } from 'lucide-react';
import { useParams } from 'react-router-dom';
import TqRepliedForm from './components/TqRepliedForm';

export default function TqRepliedPage() {
    const { id } = useParams<{ id: string }>();
    const { data: tqData, isLoading: tqLoading } = useTqById(Number(id));

    if (tqLoading) return <Skeleton />;
    if (!tqData) return <Alert>TQ not found</Alert>;

    if (tqData.status !== 'TQ received') {
        return (
            <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                    This TQ is not in received status. Only received TQs can be replied to.
                </AlertDescription>
            </Alert>
        );
    }

    return (
        <TqRepliedForm
            tqData={tqData}
            mode="replied"
        />
    );
}
