import { useParams, useNavigate } from 'react-router-dom';
import UploadResultFormPage from './components/UploadResultFormPage';
import { useTender } from '@/hooks/api/useTenders';
import { useBidSubmissionByTender } from '@/hooks/api/useBidSubmissions';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { paths } from '@/app/routes/paths';
import React from 'react';
import apiClient from '@/lib/axios';

export default function TenderResultUploadPage() {
    const { tenderId } = useParams<{ tenderId: string }>();
    const navigate = useNavigate();
    const { data: tenderDetails, isLoading: tenderLoading } = useTender(Number(tenderId));
    const { data: bidSubmission, isLoading: bidLoading } = useBidSubmissionByTender(Number(tenderId));

    // Fetch or create result entry
    const [resultId, setResultId] = React.useState<number | null>(null);
    const [isCreatingResult, setIsCreatingResult] = React.useState(false);

    React.useEffect(() => {
        if (tenderId && bidSubmission) {
            // Check if result exists for this tender
            apiClient.get(`/tender-results/tender/${tenderId}`)
                .then((response) => {
                    if (response.data) {
                        setResultId(response.data.id);
                    } else {
                        // Create result entry if it doesn't exist
                        setIsCreatingResult(true);
                        apiClient.post(`/tender-results/create/${tenderId}`)
                            .then((createResponse) => {
                                setResultId(createResponse.data.id);
                                setIsCreatingResult(false);
                            })
                            .catch(() => {
                                setIsCreatingResult(false);
                            });
                    }
                })
                .catch(() => {
                    // If error, try to create
                    setIsCreatingResult(true);
                    apiClient.post(`/tender-results/create/${tenderId}`)
                        .then((createResponse) => {
                            setResultId(createResponse.data.id);
                            setIsCreatingResult(false);
                        })
                        .catch(() => {
                            setIsCreatingResult(false);
                        });
                });
        }
    }, [tenderId, bidSubmission]);

    if (tenderLoading || bidLoading || isCreatingResult) return <Skeleton className="h-[800px]" />;

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

    if (!bidSubmission) {
        return (
            <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                    This tender does not have a bid submission. Please submit the bid first.
                    <Button variant="outline" onClick={() => navigate(paths.tendering.results)} className="ml-4">
                        Back to List
                    </Button>
                </AlertDescription>
            </Alert>
        );
    }

    // Check if this is an RA tender - if so, redirect to RA dashboard
    // We'll check this after getting the result, but for now we'll proceed
    // The form component will handle the validation

    if (!resultId) {
        return <Skeleton className="h-[800px]" />;
    }

    return (
        <UploadResultFormPage
            resultId={resultId}
            tenderDetails={{
                tenderNo: tenderDetails.tenderNo,
                tenderName: tenderDetails.tenderName,
            }}
            isEditMode={false}
            onSuccess={() => navigate(paths.tendering.resultsShow(resultId))}
        />
    );
}
