import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import { useParams } from 'react-router-dom';
import { BiBankGuaranteeRequestForm } from '../components/BiBankGuaranteeRequestForm';

export default function CreateBiBankGuaranteePage() {
    const { projectId } = useParams<{ projectId: string }>();

    if (!projectId) {
        return (
            <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>Select a project from the list</AlertDescription>
            </Alert>
        );
    }

    return <BiBankGuaranteeRequestForm projectId={Number(projectId)} />;
}
