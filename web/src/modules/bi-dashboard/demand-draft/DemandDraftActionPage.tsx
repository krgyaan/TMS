import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardAction } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, ArrowLeft, Loader2 } from 'lucide-react';
import { DemandDraftActionForm } from './components/DemandDraftActionForm';
import { useDDActionFormData, useDDFollowupData } from '@/hooks/api/useDemandDrafts';
import { formatINR } from '@/hooks/useINRFormatter';

const STORAGE_KEY = 'dd_action_data';

interface StoredData {
    action: number;
    tenderNo: string | null;
    tenderName: string | null;
    amount: number | null;
    timestamp: number;
}

export default function DemandDraftActionPage() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const location = useLocation();
    const instrumentId = id ? Number(id) : 0;

    const { data: actionFormData, isLoading: isLoadingActionForm } = useDDActionFormData(instrumentId);
    const { data: followupData, isLoading: isLoadingFollowup } = useDDFollowupData(instrumentId);

    const action = actionFormData?.action ?? null;

    useEffect(() => {
        if (actionFormData) {
            const storedData: StoredData = {
                action: actionFormData.action ?? 0,
                tenderNo: actionFormData.tenderNo,
                tenderName: actionFormData.tenderName,
                amount: actionFormData.amount,
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
                if (Date.now() - parsed.timestamp < 3600000) return parsed;
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
                tenderStatusName: actionFormData.tenderStatusName ?? undefined,
                ddNo: actionFormData.ddNo ?? undefined,
                ddDate: actionFormData.ddDate ?? undefined,
            };
        }
        const stored = getStoredData();
        if (stored) {
            return {
                tenderNo: stored.tenderNo ?? undefined,
                tenderName: stored.tenderName ?? undefined,
                amount: stored.amount ?? undefined,
                tenderStatusName: undefined,
                ddNo: undefined,
                ddDate: undefined,
            };
        }
        const locationData = location.state as { tenderNo?: string; tenderName?: string; amount?: number } | undefined;
        if (locationData) {
            return {
                tenderNo: locationData.tenderNo,
                tenderName: locationData.tenderName,
                amount: locationData.amount,
                tenderStatusName: undefined,
                ddNo: undefined,
                ddDate: undefined,
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
                        <CardTitle>Demand Draft Action Form</CardTitle>
                        <CardDescription className="text-sm text-muted-foreground">
                            {[
                                instrumentData?.tenderNo && instrumentData?.tenderName
                                    ? `${instrumentData.tenderNo} - ${instrumentData.tenderName}`
                                    : `Instrument ID: ${instrumentId}`,
                                instrumentData?.amount && formatINR(instrumentData.amount),
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
                <DemandDraftActionForm
                    instrumentId={instrumentId}
                    action={currentAction}
                    instrumentData={instrumentData}
                    tenderId={actionFormData?.tenderId ?? null}
                    formHistory={{
                        accountsForm: actionFormData ? {
                            ddReq: actionFormData.ddStatus === 'Rejected' ? 'Rejected' :
                                   actionFormData.ddStatus === 'Accepted' ? 'Accepted' :
                                   actionFormData.ddRemarks ? 'Accepted' : undefined,
                            reasonReq: actionFormData.ddStatus === 'Rejected' ? (actionFormData as any).rejectionReason ?? undefined : undefined,
                            ddNo: actionFormData.ddNo ?? undefined,
                            ddDate: actionFormData.ddDate ? new Date(actionFormData.ddDate).toISOString() : undefined,
                            reqNo: actionFormData.reqNo ?? undefined,
                            remarks: actionFormData.ddRemarks ?? undefined,
                        } : undefined,
                        initiateFollowup: followupData ? {
                            organisationName: followupData.organisationName ?? undefined,
                            contacts: followupData.contacts ?? [],
                            followupStartDate: followupData.followupStartDate ? new Date(followupData.followupStartDate).toISOString() : undefined,
                            frequency: followupData.frequency ?? undefined,
                        } : undefined,
                        returnedCourier: actionFormData ? {
                            docketNo: actionFormData.docketNo ?? undefined,
                            docketSlip: actionFormData.docketSlip ?? undefined,
                        } : undefined,
                        returnedBankTransfer: actionFormData ? {
                            transferDate: actionFormData.utr ? undefined : undefined,
                            utr: actionFormData.utr ?? undefined,
                        } : undefined,
                        settled: actionFormData?.action !== undefined && actionFormData.action >= 5 ? {
                        } : undefined,
                        requestCancellation: actionFormData?.action !== undefined && actionFormData.action >= 6 ? {
                        } : undefined,
                        cancellationConfirmation: actionFormData ? {
                            cancellationDate: (actionFormData as any).creditDate ?? undefined,
                            cancellationAmount: (actionFormData as any).creditAmount ?? undefined,
                            cancellationReferenceNo: (actionFormData as any).referenceNo ?? undefined,
                        } : undefined,
                    }}
                />
            </CardContent>
        </Card>
    );
}
