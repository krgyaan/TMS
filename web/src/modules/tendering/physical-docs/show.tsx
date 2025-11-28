import { useParams, useNavigate } from 'react-router-dom';
import { usePhysicalDocByTenderId } from '@/hooks/api/usePhysicalDocs';
import { PhysicalDocsView } from './components/PhysicalDocsView';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { paths } from '@/app/routes/paths';

export default function PhysicalDocsShow() {
    const navigate = useNavigate();
    const { id } = useParams<{ id: string }>();
    const tenderId = id ? parseInt(id) : null;

    const { data: physicalDoc, isLoading, error } = usePhysicalDocByTenderId(tenderId);

    if (!tenderId || error || !physicalDoc) {
        return (
            <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                    Physical documents not found or failed to load.
                    {error && <p className="mt-2">{error.message}</p>}
                    <Button
                        variant="outline"
                        size="sm"
                        className="ml-4"
                        onClick={() => navigate(paths.tendering.physicalDocs)}
                    >
                        Back to List
                    </Button>
                </AlertDescription>
            </Alert>
        );
    }

    return (
        <div className="space-y-6">
            <PhysicalDocsView
                physicalDoc={physicalDoc ?? null}
                isLoading={isLoading}
                showEditButton
                showBackButton
                onEdit={() => navigate(paths.tendering.physicalDocsEdit(tenderId))}
                onBack={() => navigate(paths.tendering.physicalDocs)}
            />
        </div>
    );
}
