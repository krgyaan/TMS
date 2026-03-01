import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardAction } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, ArrowLeft } from 'lucide-react';
import { BankGuaranteeActionForm } from './components/BankGuaranteeActionForm';
import type { BankGuaranteeDashboardRow } from './helpers/bankGuarantee.types';

export default function BankGuaranteeActionPage() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const location = useLocation();
    const instrumentId = id ? Number(id) : 0;

    // Get instrument data from navigation state if available
    const instrumentData = location.state as BankGuaranteeDashboardRow | undefined;

    if (!id || !instrumentId) {
        return (
            <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>Invalid instrument ID</AlertDescription>
            </Alert>
        );
    }

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle>Bank Guarantee Action Form</CardTitle>
                        <CardDescription>
                            {instrumentData?.tenderNo && instrumentData?.tenderName
                                ? `${instrumentData.tenderNo} - ${instrumentData.tenderName}`
                                : `Instrument ID: ${instrumentId}`}
                        </CardDescription>
                    </div>
                    <CardAction>
                        <Button variant="outline" onClick={() => navigate(-1)}>
                            <ArrowLeft className="mr-2 h-4 w-4" /> Back
                        </Button>
                    </CardAction>
                </div>
            </CardHeader>
            <CardContent>
                <BankGuaranteeActionForm
                    instrumentId={instrumentId}
                    instrumentData={instrumentData ? {
                        bgNo: instrumentData.bgNo || undefined,
                        bgDate: instrumentData.bgDate || undefined,
                        amount: instrumentData.amount || undefined,
                        tenderName: instrumentData.tenderName || undefined,
                        tenderNo: instrumentData.tenderNo || undefined,
                    } : undefined}
                />
            </CardContent>
        </Card>
    );
}
