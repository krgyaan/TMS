import { useParams } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import { useClientDirectory } from '@/hooks/api/useClientDirectory';
import { HappyCallingForm } from '@/modules/crm/happy-calling/components/HappyCallingForm';

const HappyCallingCreatePage = () => {
    const { clientId } = useParams<{ clientId: string }>();
    const parsedClientId = clientId ? parseInt(clientId, 10) : null;

    const { data: client, isLoading } = useClientDirectory(parsedClientId);

    if (isLoading) {
        return (
            <Card>
                <CardContent className="p-6">
                    <Skeleton className="h-8 w-64" />
                    <Skeleton className="h-4 w-48 mt-2" />
                    <Skeleton className="h-[300px] w-full mt-4" />
                </CardContent>
            </Card>
        );
    }

    if (!parsedClientId) {
        return (
            <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>Client ID is required</AlertDescription>
            </Alert>
        );
    }

    if (!client) {
        return (
            <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>Client not found</AlertDescription>
            </Alert>
        );
    }

    return (
        <Card>
            <CardContent className="p-6">
                <HappyCallingForm mode="create" client={client} />
            </CardContent>
        </Card>
    );
};

export default HappyCallingCreatePage;
