import { useParams } from 'react-router-dom';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, Loader2 } from 'lucide-react';
import { BankGuaranteeRequestForm } from './components/BankGuaranteeRequestForm';
import { usePaymentRequestForEdit } from '@/hooks/api/usePaymentRequests';

export default function BankGuaranteeEditPage() {
    const { id } = useParams<{ id: string }>();
    const requestId = id ? Number(id) : 0;

    const { data, isLoading, error } = usePaymentRequestForEdit(requestId || null);

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-muted-foreground">Loading Bank Guarantee details...</p>
            </div>
        );
    }

    if (error || !data) {
        return (
            <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                    {error instanceof Error ? error.message : 'Failed to load Bank Guarantee details'}
                </AlertDescription>
            </Alert>
        );
    }

    return (
        <BankGuaranteeRequestForm
            mode="edit"
            requestId={requestId}
            initialData={data as Record<string, any>}
        />
    );
}
