import { useParams, useNavigate } from 'react-router-dom';
import { useTender } from '@/hooks/api/useTenders';
import { TenderView } from './components/TenderView';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { paths } from '@/app/routes/paths';

export default function TenderShowPage() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { data: tender, isLoading, error } = useTender(id ? Number(id) : null);

    if (error || (!isLoading && !tender)) {
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

    return (
        <TenderView
            tender={tender!}
            isLoading={isLoading}
            showEditButton
            showBackButton
            onEdit={() => navigate(paths.tendering.tenderEdit(id!))}
            onBack={() => navigate(paths.tendering.tenders)}
        />
    );
}
