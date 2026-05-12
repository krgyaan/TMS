import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { useBankTransferActionFormData, useBankTransferFollowupData, type BankTransferActionFormData } from '@/hooks/api/useBankTransfers';
import { BankTransferView } from './components/BantTransferView';
import { paths } from '@/app/routes/paths';
import { TenderView } from '@/modules/tendering/tenders/components/TenderView';

const BankTransferDetailsPage = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const instrumentId = id ? parseInt(id, 10) : 0;

    const { data, isLoading, error } = useBankTransferActionFormData(instrumentId);
    const { data: followupData } = useBankTransferFollowupData(instrumentId);

    if (isLoading) {
        return (
            <div className="space-y-6">
                <Button variant="outline" onClick={() => navigate(paths.bi.bankTransfer)}>
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
                <Button variant="outline" onClick={() => navigate(paths.bi.bankTransfer)}>
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back
                </Button>
                <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                        Failed to load bank transfer details. Please try again later.
                    </AlertDescription>
                </Alert>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <Button variant="outline" onClick={() => navigate(paths.bi.bankTransfer)}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
            </Button>
            <BankTransferView data={data as BankTransferActionFormData} followupData={followupData} />
            {data?.tenderId && (
                <>
                    <TenderView tenderId={data?.tenderId as number} />
                </>
            )}
        </div>
    );
};

export default BankTransferDetailsPage;