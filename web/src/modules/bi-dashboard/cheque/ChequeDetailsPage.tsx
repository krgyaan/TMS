import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft, AlertCircle, Loader2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { useChequeDetails } from '@/hooks/api/useCheques';
import { ChequeView } from './components/ChequeView';
import { TenderView } from '@/modules/tendering/tenders/components/TenderView';
import { InfoSheetView } from '@/modules/tendering/info-sheet/components/InfoSheetView';
import { useTender } from '@/hooks/api/useTenders';
import { useInfoSheet } from '@/hooks/api/useInfoSheets';
import { paths } from '@/app/routes/paths';

const ChequeDetailsPage = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const requestId = id ? parseInt(id, 10) : 0;

    const { data, isLoading, error } = useChequeDetails(requestId);

    const tenderId = data?.tenderId && !Number.isNaN(Number(data.tenderId))
        ? Number(data.tenderId)
        : null;
    const { data: tender, isLoading: isTenderLoading } = useTender(tenderId);
    const { data: infoSheet, isLoading: infoSheetLoading, error: infoSheetError } = useInfoSheet(tenderId);

    if (isLoading) {
        return (
            <div className="space-y-6">
                <Button variant="outline" onClick={() => navigate(paths.bi.cheque)}>
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back
                </Button>
                <Skeleton className="h-[600px]" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="space-y-6">
                <Button variant="outline" onClick={() => navigate(paths.bi.cheque)}>
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back
                </Button>
                <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                        Failed to load cheque details. Please try again later.
                    </AlertDescription>
                </Alert>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <Button variant="outline" onClick={() => navigate(paths.bi.cheque)}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
            </Button>
            <ChequeView data={data} isLoading={isLoading} />
            {tenderId && (
                <div className="space-y-5">
                    {isTenderLoading ? (
                        <div className="flex items-center justify-center py-8">
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        </div>
                    ) : tender ? (
                        <TenderView tender={tender} />
                    ) : (
                        <div className="text-center py-8 text-muted-foreground">
                            No tender details found
                        </div>
                    )}
                    {infoSheetLoading ? (
                        <div className="flex items-center justify-center py-8">
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        </div>
                    ) : infoSheetError ? (
                        <Alert variant="destructive" className="mb-4">
                            <AlertCircle className="h-4 w-4" />
                            <AlertDescription>
                                Failed to load info sheet details
                            </AlertDescription>
                        </Alert>
                    ) : infoSheet ? (
                        <InfoSheetView infoSheet={infoSheet} />
                    ) : (
                        <div className="text-center py-8 text-muted-foreground">
                            No info sheet details found
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default ChequeDetailsPage;
