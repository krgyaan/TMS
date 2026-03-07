import { useParams } from 'react-router-dom';
import { SubmitQueryView } from './components/SubmitQueryView';
import { useSubmitQuery } from '@/hooks/api/useSubmitQuery';
import { Alert, AlertDescription } from '@/components/ui/alert';

export function SubmitQueryViewPage() {
    const { id } = useParams<{ id: string }>();
    const submitQueryId = id ? parseInt(id, 10) : 0;

    if (!submitQueryId) {
        return (
            <Alert variant="destructive">
                <AlertDescription>Invalid Submit Query ID</AlertDescription>
            </Alert>
        )
    }

    const { data, isLoading, error } = useSubmitQuery(submitQueryId);

    return (
        <div className="container mx-auto py-6">
            <SubmitQueryView
                data={data!}
                isLoading={isLoading}
                error={error}
            />
        </div>
    );
}

export default SubmitQueryViewPage;
