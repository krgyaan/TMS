import { useParams, useNavigate } from 'react-router-dom';
import RAResultFormPage from './components/RAResultFormPage';
import { useReverseAuction } from '@/hooks/api/useReverseAuctions';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { paths } from '@/app/routes/paths';

export default function RaUploadResultPage() {
    const { raId } = useParams<{ raId: string }>();
    const navigate = useNavigate();
    const raIdNum = Number(raId);
    const { data: ra, isLoading, error } = useReverseAuction(raIdNum);

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

    return (
        <RAResultFormPage
            raId={raIdNum}
            tenderDetails={{
                tenderNo: ra.tenderNo,
                tenderName: ra.tenderName,
            }}
            onSuccess={() => navigate(paths.tendering.ras)}
        />
    );
}
