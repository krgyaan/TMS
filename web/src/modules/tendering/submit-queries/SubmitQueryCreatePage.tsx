import { useParams } from 'react-router-dom';
import { SubmitQueryForm } from './components/SubmitQueryForm';
import { Alert, AlertDescription } from '@/components/ui/alert';

export function SubmitQueryCreatePage() {
    const { tenderId } = useParams<{ tenderId: string }>();

    if (!tenderId || isNaN(parseInt(tenderId, 10))) {
        return (
            <Alert variant="destructive">
                <AlertDescription>Invalid Tender ID</AlertDescription>
            </Alert>
        );
    }

    return (
        <div className="container mx-auto py-6">
            <SubmitQueryForm
                mode="create"
                tenderId={tenderId ? parseInt(tenderId, 10) : undefined}
            />
        </div>
    );
}

export default SubmitQueryCreatePage;
