import { useParams } from 'react-router-dom';
import { Alert, AlertDescription } from '@/components/ui/alert';
import RequestExtensionView from './components/RequestExtensionView';
import { useRequestExtension } from '@/hooks/api/useRequestExtension';

export function RequestExtensionViewPage() {
    const { id } = useParams<{ id: string }>();
    const requestExtensionId = id ? parseInt(id, 10) : 0;

    if (!requestExtensionId) {
        return (
            <Alert variant="destructive">
                <AlertDescription>Invalid Request Extension ID</AlertDescription>
            </Alert>
        )
    }

    const { data, isLoading, error } = useRequestExtension(requestExtensionId);

    return (
        <div className="container mx-auto py-6">
            <RequestExtensionView
                data={data!}
                isLoading={isLoading}
                error={error}
            />
        </div>
    );
}

export default RequestExtensionViewPage;
