import { paths } from '@/app/routes/paths';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useTqById } from '@/hooks/api/useTqManagement';
import { AlertCircle } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import TqMissedForm from './components/TqMissedForm';

export default function TqEditMissedPage() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { data: tqData, isLoading: tqLoading } = useTqById(Number(id));

    if (tqLoading) return <Skeleton className="h-[800px]" />;
    if (!tqData) return (
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

    return (
        <TqMissedForm
            tqData={tqData}
            mode="edit"
        />
    );
}
