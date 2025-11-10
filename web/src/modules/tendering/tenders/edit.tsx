import { useParams, useNavigate } from 'react-router-dom';
import { TenderForm } from './components/TenderForm';
import { useTender } from '@/hooks/api/useTenders';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { paths } from '@/app/routes/paths';

export default function TenderEditPage() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { data: tender, isLoading, error } = useTender(id ? Number(id) : null);

    if (isLoading) {
        return (
            <div className="space-y-4">
                <Skeleton className="h-8 w-48" />
                <Skeleton className="h-96 w-full" />
            </div>
        );
    }

    if (error || !tender) {
        return (
            <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                    Tender not found or failed to load.
                    <Button
                        variant="outline"
                        size="sm"
                        className="ml-4"
                        onClick={() => navigate(paths.tendering.tenders)}
                    >
                        Back to List
                    </Button>
                </AlertDescription>
            </Alert>
        );
    }

    return <TenderForm tender={tender} mode="edit" />;
}
