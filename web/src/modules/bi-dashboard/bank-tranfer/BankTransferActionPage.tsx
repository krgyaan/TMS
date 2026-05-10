import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardAction } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, ArrowLeft, Loader2 } from 'lucide-react';
import { BankTransferActionForm } from './components/BankTransferActionForm';
import { useBankTransferActionFormData, useBankTransferFollowupData } from '@/hooks/api/useBankTransfers';
import { formatINR } from '@/hooks/useINRFormatter';

const STORAGE_KEY = 'bank_transfer_action_data';

interface StoredData {
    action: number;
    tenderNo: string | null;
    tenderName: string | null;
    amount: number | null;
    accountName: string | null;
    utrNo: string | null;
    timestamp: number;
}

export default function BankTransferActionPage() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const location = useLocation();
    const instrumentId = id ? Number(id) : 0;

    const { data: actionFormData, isLoading: isLoadingActionForm } = useBankTransferActionFormData(instrumentId);
    const { data: followupData, isLoading: isLoadingFollowup } = useBankTransferFollowupData(instrumentId);

    const action = actionFormData?.action ?? null;

    useEffect(() => {
        if (actionFormData) {
            const storedData: StoredData = {
                action: actionFormData.action ?? 0,
                tenderNo: actionFormData.tenderNo,
                tenderName: actionFormData.tenderName,
                amount: actionFormData.amount,
                accountName: actionFormData.accountName,
                utrNo: actionFormData.utrNo,
                timestamp: Date.now(),
            };
            localStorage.setItem(STORAGE_KEY, JSON.stringify(storedData));
        }
    }, [actionFormData]);

    const getStoredData = (): StoredData | null => {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            if (stored) {
                const parsed: StoredData = JSON.parse(stored);
                if (Date.now() - parsed.timestamp < 3600000) {
                    return parsed;
                }
            }
        } catch (e) {
            console.error('Error reading stored data:', e);
        }
        return null;
    };

    const getInstrumentData = () => {
        if (actionFormData) {
            return {
                tenderNo: actionFormData.tenderNo ?? undefined,
                tenderName: actionFormData.tenderName ?? undefined,
                amount: actionFormData.amount ?? undefined,
                accountName: actionFormData.accountName ?? undefined,
                utrNo: actionFormData.utrNo ?? undefined,
            };
        }
        const stored = getStoredData();
        if (stored) {
            return {
                tenderNo: stored.tenderNo ?? undefined,
                tenderName: stored.tenderName ?? undefined,
                amount: stored.amount ?? undefined,
                accountName: stored.accountName ?? undefined,
                utrNo: stored.utrNo ?? undefined,
            };
        }
        const locationData = location.state as { tenderNo?: string; tenderName?: string; amount?: number; accountName?: string; utrNo?: string } | undefined;
        if (locationData) {
            return {
                tenderNo: locationData.tenderNo,
                tenderName: locationData.tenderName,
                amount: locationData.amount,
                accountName: locationData.accountName,
                utrNo: locationData.utrNo,
            };
        }
        return undefined;
    };

    const currentAction = action ?? getStoredData()?.action ?? 0;
    const instrumentData = getInstrumentData();

    if (!id || !instrumentId) {
        return (
            <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>Invalid instrument ID</AlertDescription>
            </Alert>
        );
    }

    if (isLoadingActionForm || isLoadingFollowup) {
        return (
            <Card>
                <CardContent className="pt-6">
                    <div className="flex items-center justify-center py-12">
                        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle>Bank Transfer Action Form</CardTitle>
                        <CardDescription className="text-sm text-muted-foreground">
                            {[
                                instrumentData?.tenderNo && instrumentData?.tenderName
                                    ? `${instrumentData.tenderNo} - ${instrumentData.tenderName}`
                                    : `Instrument ID: ${instrumentId}`,

                                instrumentData?.amount && formatINR(instrumentData.amount),

                                instrumentData?.accountName
                            ]
                                .filter(Boolean)
                                .join(" / ")}
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
                <BankTransferActionForm
                    instrumentId={instrumentId}
                    action={currentAction}
                    instrumentData={instrumentData}
                    formHistory={{
                        accountsForm: actionFormData ? {
                            btReq: actionFormData.rejectionReason ? 'Rejected' : 
                                    (actionFormData.utrNo || actionFormData.transactionDate || actionFormData.utrMsg || actionFormData.paymentDateTime) ? 'Accepted' : undefined,
                            reasonReq: actionFormData.rejectionReason ?? undefined,
                            paymentDatetime: actionFormData.paymentDateTime ?? undefined,
                            utrNo: actionFormData.utrNo ?? undefined,
                            utrMessage: actionFormData.utrMsg ?? undefined,
                            remarks: actionFormData.remarks ?? undefined,
                        } : undefined,
                        initiateFollowup: followupData ? {
                            organisationName: followupData.organisationName ?? undefined,
                            contacts: followupData.contacts ?? [],
                            followupStartDate: followupData.followupStartDate ? new Date(followupData.followupStartDate).toISOString() : undefined,
                            frequency: followupData.frequency ?? undefined,
                            stopReason: followupData.stopReason ?? undefined,
                            proofText: followupData.proofText ?? undefined,
                            stopRemarks: followupData.stopRemarks ?? undefined,
                        } : undefined,
                        returned: actionFormData ? {
                            transferDate: actionFormData.returnTransferDate ? new Date(actionFormData.returnTransferDate).toISOString() : undefined,
                            utrNo: actionFormData.returnUtr ?? undefined,
                        } : undefined,
                        settled: actionFormData ? {
                            remarks: actionFormData.remarks ?? undefined,
                        } : undefined,
                    }}
                />
            </CardContent>
        </Card>
    );
}
