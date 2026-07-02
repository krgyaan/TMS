import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { usePayOnPortalActionFormData, usePayOnPortalFollowupData, type PayOnPortalActionFormData } from '@/hooks/api/usePayOnPortals';
import { PayOnPortalView } from './components/PayOnPortalView';
import { paths } from '@/app/routes/paths';
import { TenderView } from '@/modules/tendering/tenders/components/TenderView';

const PayOnPortalDetailsPage = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const instrumentId = id ? parseInt(id, 10) : 0;

    const { data, isLoading, error } = usePayOnPortalActionFormData(instrumentId);
    const { data: followupData } = usePayOnPortalFollowupData(instrumentId);

    if (isLoading) {
        return (
            <div className="space-y-6">
                <Button variant="outline" onClick={() => navigate(paths.bi.payOnPortal)}>
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
                <Button variant="outline" onClick={() => navigate(paths.bi.payOnPortal)}>
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back
                </Button>
                <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                        Failed to load pay on portal details. Please try again later.
                    </AlertDescription>
                </Alert>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <Button variant="outline" onClick={() => navigate(paths.bi.payOnPortal)}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
            </Button>
            <PayOnPortalView data={data as PayOnPortalActionFormData} followupData={followupData} />
            {data?.tenderId && (
                <>
                    <TenderView tenderId={data?.tenderId as number} />
                </>
            )}
        </div>
    );
};

export default PayOnPortalDetailsPage;