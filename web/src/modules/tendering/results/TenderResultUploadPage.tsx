import { useParams, useNavigate } from 'react-router-dom';
import UploadResultFormPage from './components/UploadResultFormPage';
import { useTender } from '@/hooks/api/useTenders';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { paths } from '@/app/routes/paths';
import { useTenderResult, useTenderResultByTenderId } from '@/hooks/api/useTenderResults';
import { useInfoSheet } from '@/hooks/api/useInfoSheets';
import { Skeleton } from '@/components/ui/skeleton';
import { SubmissionChecklist, type Checkpoint } from '@/components/tendering/SubmissionChecklist';
import { Card, CardContent, CardHeader } from '@/components/ui/card';

export default function TenderResultUploadPage() {
    const { tenderId, id } = useParams<{ tenderId?: string; id?: string }>();
    const navigate = useNavigate();
    const isEditMode = !!id;

    const resultId = id ? Number(id) : null;
    const tenderIdNum = tenderId ? Number(tenderId) : null;

    // Fetch result by ID if in edit mode
    const { data: editResult, isLoading: editResultLoading, error: editResultError } = useTenderResult(resultId);

    // Fetch result by tender ID if in upload mode
    const { data: uploadResult, isLoading: uploadResultLoading } = useTenderResultByTenderId(isEditMode ? null : tenderIdNum);

    const result = isEditMode ? editResult : uploadResult;
    const resultLoading = isEditMode ? editResultLoading : uploadResultLoading;

    // The effective tender ID to fetch tender details
    const effectiveTenderId = isEditMode ? result?.tenderId : tenderIdNum;

    const { data: tenderDetails, isLoading: tenderLoading } = useTender(effectiveTenderId ?? null);
    const { data: infoSheet } = useInfoSheet(effectiveTenderId ?? null);
    const ITEM_WISE_TYPES = ['ITEM_WISE_PRE_GST', 'ITEM_WISE_GST_INCLUSIVE'];
    const isItemWise = infoSheet && ITEM_WISE_TYPES.includes(infoSheet.commercialEvaluation ?? '');

    if (resultLoading || tenderLoading || (isEditMode && !result)) {
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

    if (isEditMode && (editResultError || !result)) {
        return (
            <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                    Result not found or failed to load.
                    <br />
                    {editResultError?.message}
                    <br />
                    <Button variant="outline" size="sm" className="ml-4" onClick={() => navigate(paths.tendering.results)}>
                        Back to List
                    </Button>
                </AlertDescription>
            </Alert>
        );
    }

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

    const raStatus = result ? result?.raStatus : 'pending';
    const tqStatus = result ? result?.tqStatus : 'pending';

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
    ];

    return (
        <>
            <SubmissionChecklist checkpoints={checkpoints} />

            <UploadResultFormPage
                tenderId={effectiveTenderId!}
                tenderDetails={{
                    tenderNo: tenderDetails.tenderNo,
                    tenderName: tenderDetails.tenderName,
                    partiesCount: result?.qualifiedPartiesCount || '',
                    partiesNames: result?.qualifiedPartiesNames || [],
                }}
                isEditMode={isEditMode}
                isItemWise={isItemWise ?? false}
                onSuccess={() => navigate(paths.tendering.results)}
            />
        </>
    );
}
