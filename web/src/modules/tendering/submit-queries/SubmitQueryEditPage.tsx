import { useParams } from 'react-router-dom';
import { SubmitQueryForm } from './components/SubmitQueryForm';
import { useSubmitQuery } from '@/hooks/api/useSubmitQuery';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';

export function SubmitQueryEditPage() {
    const { id } = useParams<{ id: string }>();
    const submitQueryId = id ? parseInt(id, 10) : 0;

    const { data, isLoading, error } = useSubmitQuery(submitQueryId);

    if (error) {
        return (
            <Alert variant="destructive">
                <AlertTitle>Error loading submit query</AlertTitle>
                <AlertDescription>{error.message}</AlertDescription>
            </Alert>
        );
    }

    if (isLoading) {
        return (
            <Skeleton className="h-10 w-full mb-4" />
        );
    }

    return (
        <div className="container mx-auto py-6">
            <SubmitQueryForm
                mode="edit"
                tenderId={data?.tenderId}
                existingData={data}
            />
        </div>
    );
}

export default SubmitQueryEditPage;
