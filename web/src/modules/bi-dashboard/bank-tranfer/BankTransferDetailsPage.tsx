import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { useBankTransferDetails } from '@/hooks/api/useBankTransfers';
import { BankTransferView } from './components/BantTransferView';
import { paths } from '@/app/routes/paths';

const BankTransferDetailsPage = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const requestId = id ? parseInt(id, 10) : 0;

    const { data, isLoading, error } = useBankTransferDetails(requestId);

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
            <BankTransferView data={data} isLoading={isLoading} />
        </div>
    );
};

export default BankTransferDetailsPage;
