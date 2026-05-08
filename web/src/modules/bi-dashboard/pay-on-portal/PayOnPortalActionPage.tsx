import { useParams, useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardAction } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, ArrowLeft, Loader2 } from 'lucide-react';
import { PayOnPortalActionForm } from './components/PayOnPortalActionForm';
import { usePayOnPortalActionFormData, usePayOnPortalFollowupData } from '@/hooks/api/usePayOnPortals';
import { formatINR } from '@/hooks/useINRFormatter';

const STORAGE_KEY = 'pay_on_portal_action_data';

interface StoredData {
    action: number;
    tenderNo: string | null;
    tenderName: string | null;
    amount: number | null;
    portalName: string | null;
    utrNo: string | null;
    timestamp: number;
}

export default function PayOnPortalActionPage() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const instrumentId = id ? Number(id) : 0;

    const { data: actionFormData, isLoading: isLoadingActionForm } = usePayOnPortalActionFormData(instrumentId);
    const { data: followupData, isLoading: isLoadingFollowup } = usePayOnPortalFollowupData(instrumentId);

    const action = actionFormData?.action ?? null;

    useEffect(() => {
        if (actionFormData) {
            const storedData: StoredData = {
                action: actionFormData.action ?? 0,
                tenderNo: actionFormData.tenderNo,
                tenderName: actionFormData.tenderName,
                amount: actionFormData.amount,
                portalName: actionFormData.portalName,
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
                portalName: actionFormData.portalName ?? undefined,
                utrNo: actionFormData.utrNo ?? undefined,
            };
        }
        const stored = getStoredData();
        if (stored) {
            return {
                tenderNo: stored.tenderNo ?? undefined,
                tenderName: stored.tenderName ?? undefined,
                amount: stored.amount ?? undefined,
                portalName: stored.portalName ?? undefined,
                utrNo: stored.utrNo ?? undefined,
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
                        <CardTitle>Pay on Portal Action Form</CardTitle>
                        <CardDescription className="text-sm text-muted-foreground">
                            {[
                                instrumentData?.tenderNo && instrumentData?.tenderName
                                    ? `${instrumentData.tenderNo} - ${instrumentData.tenderName}`
                                    : `Instrument ID: ${instrumentId}`,

                                instrumentData?.amount && formatINR(instrumentData.amount),

                                instrumentData?.portalName
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
                <PayOnPortalActionForm
                    instrumentId={instrumentId}
                    action={currentAction}
                    instrumentData={instrumentData}
                    formHistory={{
                        accountsForm: actionFormData ? {
                            popReq: actionFormData.rejectionReason ? 'Rejected' : 
                                    (actionFormData.utrNo || actionFormData.transactionDate || actionFormData.utrMsg || actionFormData.paymentDateTime) ? 'Accepted' : undefined,
                            reasonReq: actionFormData.rejectionReason ?? undefined,
                            paymentDatetime: actionFormData.paymentDateTime ?? undefined,
                            utrNo: actionFormData.utrNo ?? undefined,
                            utrMessage: actionFormData.utrMsg ?? undefined,
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
                    }}
                />
            </CardContent>
        </Card>
    );
}