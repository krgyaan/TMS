import { useParams, useNavigate } from 'react-router-dom';
import { useTenderResult } from '@/hooks/api/useTenderResults';
import UploadResultFormPage from './components/UploadResultFormPage';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader } from '@/components/ui/card';

export default function TenderResultEditPage() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const resultId = id ? Number(id) : null;
    const { data: result, isLoading, error } = useTenderResult(resultId!);

    if (!resultId) {
        return (
            <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                    Invalid Result ID.
                    <Button
                        variant="outline"
                        size="sm"
                        className="ml-4"
                        onClick={() => navigate('/tendering/results')}
                    >
                        Back to List
                    </Button>
                </AlertDescription>
            </Alert>
        );
    }

    if (isLoading) {
        return (
            <Card>
                <CardHeader>
                    <Skeleton className="h-8 w-48" />
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        {Array.from({ length: 8 }).map((_, i) => (
                            <Skeleton key={i} className="h-12 w-full" />
                        ))}
                    </div>
                </CardContent>
            </Card>
        );
    }

    if (error || !result) {
        return (
            <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                    Result not found or failed to load.
                    <Button
                        variant="outline"
                        size="sm"
                        className="ml-4"
                        onClick={() => navigate('/tendering/results')}
                    >
                        Back to List
                    </Button>
                </AlertDescription>
            </Alert>
        );
    }

    // Check if this is an RA tender - if so, redirect to RA dashboard
    if ((result as any).raApplicable && (result as any).reverseAuctionId) {
        return (
            <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                    This tender has RA applicable. Please upload result through RA Dashboard.
                    <Button
                        variant="outline"
                        size="sm"
                        className="ml-4"
                        onClick={() => navigate(`/tendering/ras/${(result as any).reverseAuctionId}`)}
                    >
                        View RA Details
                    </Button>
                </AlertDescription>
            </Alert>
        );
    }

    const tenderDetails = {
        tenderNo: (result as any).tenderNo || '',
        tenderName: (result as any).tenderName || '',
        partiesCount: result.qualifiedPartiesCount || '',
        partiesNames: result.qualifiedPartiesNames || [],

    };

    return (
        <UploadResultFormPage
            resultId={resultId}
            tenderDetails={tenderDetails}
            isEditMode={true}
            onSuccess={() => navigate(`/tendering/results/${resultId}`)}
        />
    );
}
