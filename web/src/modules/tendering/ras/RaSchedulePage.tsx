import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import RaScheduleFormPage from './components/RaScheduleFormPage';
import { useTender } from '@/hooks/api/useTenders';
import { useBidSubmissionByTender } from '@/hooks/api/useBidSubmissions';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { paths } from '@/app/routes/paths';
import apiClient from '@/lib/axios';

export default function RaSchedulePage() {
    const { tenderId } = useParams<{ tenderId: string }>();
    const navigate = useNavigate();
    const { data: tenderDetails, isLoading: tenderLoading } = useTender(Number(tenderId));
    const { data: bidSubmission, isLoading: bidLoading } = useBidSubmissionByTender(Number(tenderId));

    // Fetch RA by tenderId if exists
    const [raId, setRaId] = React.useState<number | null>(null);
    const [isCreatingRa, setIsCreatingRa] = React.useState(false);

    React.useEffect(() => {
        if (tenderId && bidSubmission) {
            // Check if RA exists for this tender
            apiClient.get(`/reverse-auctions/tender/${tenderId}`)
                .then((response) => {
                    if (response.data) {
                        setRaId(response.data.id);
                    } else {
                        // Create RA entry if it doesn't exist
                        setIsCreatingRa(true);
                        apiClient.post(`/reverse-auctions/create/${tenderId}`, {
                            bidSubmissionDate: bidSubmission.submissionDatetime
                        })
                            .then((createResponse) => {
                                setRaId(createResponse.data.id);
                                setIsCreatingRa(false);
                            })
                            .catch(() => {
                                setIsCreatingRa(false);
                            });
                    }
                })
                .catch(() => {
                    // If error, try to create
                    setIsCreatingRa(true);
                    apiClient.post(`/reverse-auctions/create/${tenderId}`, {
                        bidSubmissionDate: bidSubmission.submissionDatetime
                    })
                        .then((createResponse) => {
                            setRaId(createResponse.data.id);
                            setIsCreatingRa(false);
                        })
                        .catch(() => {
                            setIsCreatingRa(false);
                        });
                });
        }
    }, [tenderId, bidSubmission]);

    if (tenderLoading || bidLoading || isCreatingRa) return <Skeleton className="h-[800px]" />;

    if (!tenderDetails) {
        return (
            <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                    Tender not found.
                    <Button variant="outline" onClick={() => navigate(paths.tendering.ras)} className="ml-4">
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
                    <Button variant="outline" onClick={() => navigate(paths.tendering.ras)} className="ml-4">
                        Back to List
                    </Button>
                </AlertDescription>
            </Alert>
        );
    }

    if (!raId) {
        return <Skeleton className="h-[800px]" />;
    }

    return (
        <RaScheduleFormPage
            raId={raId}
            tenderDetails={{
                tenderNo: tenderDetails.tenderNo,
                tenderName: tenderDetails.tenderName,
            }}
            onSuccess={() => navigate(paths.tendering.rasShow(raId))}
        />
    );
}
