import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardAction } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, ArrowLeft, Loader2 } from 'lucide-react';
import { BankGuaranteeEditForm } from './components/BankGuaranteeEditForm';
import { useBankGuaranteeDetails } from '@/hooks/api/useBankGuarantees';

export default function BankGuaranteeEditPage() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const requestId = id ? Number(id) : 0;

    const { data: instrument, isLoading, error } = useBankGuaranteeDetails(requestId);

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-muted-foreground">Loading Bank Guarantee details...</p>
            </div>
        );
    }

    if (error || !instrument) {
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
        <Card className="border-none shadow-none bg-transparent">
            <CardHeader className="px-0 pt-0 pb-6">
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle className="text-2xl font-bold">Edit Bank Guarantee</CardTitle>
                        <p className="text-muted-foreground mt-1">
                            {instrument.tenderNo} - {instrument.tenderName || instrument.projectName}
                        </p>
                    </div>
                    <CardAction>
                        <Button variant="outline" onClick={() => navigate(-1)}>
                            <ArrowLeft className="mr-2 h-4 w-4" /> Back
                        </Button>
                    </CardAction>
                </div>
            </CardHeader>
            <CardContent className="px-0">
                <BankGuaranteeEditForm
                    instrumentId={instrument.instrumentId}
                    initialData={instrument}
                />
            </CardContent>
        </Card>
    );
}
