import { useParams, useNavigate } from 'react-router-dom';
import UploadResultFormPage from './components/UploadResultFormPage';
import { useTender } from '@/hooks/api/useTenders';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { paths } from '@/app/routes/paths';
import { useTenderResultByTenderId } from '@/hooks/api/useTenderResults';
import { Skeleton } from '@/components/ui/skeleton';
import { SubmissionChecklist, type Checkpoint } from '@/components/tendering/SubmissionChecklist';

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

    const raStatus = result ? result?.raStatus : 'pending';
    const tqStatus = result ? result?.tqStatus : 'pending';

    // for status checks--
    //                   |
    //                   v
    // we will check simply the tender_result-> ra_status && tender_result->tq_status


    const checkpoints: Checkpoint[] = [
        {
            id: 'tq',
            label : 'TQ Status',
            status: tqStatus === 'pending' ? 'pending' : 'fulfilled',
            description: tqStatus === 'pending' ? 'TQ not completed' : (tqStatus ?? undefined),
        },
        {
            id: 'ra',
            label : 'RA Status',
            status: raStatus === 'pending' ? 'pending' : 'fulfilled',
            description: raStatus === 'pending' ? 'RA not completed' : (raStatus ?? undefined),
        },
    ]

    return (
        <>
            <SubmissionChecklist checkpoints ={checkpoints} />

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
        </>
    );
}
