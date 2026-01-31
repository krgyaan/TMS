import { useParams, useNavigate } from 'react-router-dom';
import UploadResultFormPage from './components/UploadResultFormPage';
import { useTender } from '@/hooks/api/useTenders';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { paths } from '@/app/routes/paths';
import { useTenderResultByTenderId } from '@/hooks/api/useTenderResults';
import { Skeleton } from '@/components/ui/skeleton';

export default function TenderResultUploadPage() {
    const { tenderId } = useParams<{ tenderId: string }>();
    const navigate = useNavigate();
    const tenderIdNum = Number(tenderId);

    const { data: tenderDetails, isLoading: tenderLoading } = useTender(tenderIdNum);
    const { data: result, isLoading: resultLoading } = useTenderResultByTenderId(tenderIdNum);

    if (!tenderDetails) {
        return (
            <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                    Tender not found.
                    <Button variant="outline" onClick={() => navigate(paths.tendering.results)} className="ml-4">
                        Back to List
                    </Button>
                </AlertDescription>
            </Alert>
        );
    }

    if (tenderLoading || resultLoading) {
        return <Skeleton className="h-[800px]" />;
    }

    return (
        <UploadResultFormPage
            tenderId={tenderIdNum}
            tenderDetails={{
                tenderNo: tenderDetails.tenderNo,
                tenderName: tenderDetails.tenderName,
                partiesCount: result?.qualifiedPartiesCount || '',
                partiesNames: result?.qualifiedPartiesNames || [],
            }}
            isEditMode={false}
            onSuccess={() => navigate(paths.tendering.results)}
        />
    );
}
