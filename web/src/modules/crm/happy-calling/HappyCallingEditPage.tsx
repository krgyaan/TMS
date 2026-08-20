import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useHappyCalling } from '@/hooks/api/useHappyCalling';
import { HappyCallingForm } from '@/modules/crm/happy-calling/components/HappyCallingForm';
import { paths } from '@/app/routes/paths';

const HappyCallingEditPage = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const recordId = id ? parseInt(id, 10) : null;

    const { data: record, isLoading } = useHappyCalling(recordId);

    const backToList = () => navigate(paths.crm.happyCalling);

    if (isLoading) {
        return (
            <Card>
                <CardContent className="p-6">
                    <Skeleton className="h-8 w-64" />
                    <Skeleton className="h-[400px] w-full mt-4" />
                </CardContent>
            </Card>
        );
    }

    if (!record) {
        return (
            <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                    Happy calling entry not found.
                    <Button variant="outline" size="sm" className="ml-4" onClick={backToList}>
                        Back to List
                    </Button>
                </AlertDescription>
            </Alert>
        );
    }

    return (
        <Card>
            <CardContent className="p-6">
                <HappyCallingForm
                    mode="edit"
                    record={record}
                    onBack={backToList}
                    onSaved={backToList}
                />
            </CardContent>
        </Card>
    );
};

export default HappyCallingEditPage;