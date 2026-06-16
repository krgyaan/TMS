import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardAction } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, ArrowLeft, Loader2 } from 'lucide-react';
import { DemandDraftActionForm } from '@/modules/bi-dashboard/demand-draft/components/DemandDraftActionForm';
import { PayOnPortalActionForm } from '@/modules/bi-dashboard/pay-on-portal/components/PayOnPortalActionForm';
import { BankTransferActionForm } from '@/modules/bi-dashboard/bank-tranfer/components/BankTransferActionForm';
import { useDDActionFormData, useDDFollowupData } from '@/hooks/api/useDemandDrafts';
import { usePayOnPortalActionFormData, usePayOnPortalFollowupData } from '@/hooks/api/usePayOnPortals';
import { useBankTransferActionFormData, useBankTransferFollowupData } from '@/hooks/api/useBankTransfers';
import { formatINR } from '@/hooks/useINRFormatter';

const TenderFeeActionPage = () => {
    const { type, id } = useParams<{ type: string; id: string }>();
    const navigate = useNavigate();
    const instrumentId = id ? Number(id) : 0;

    const isDd = type === 'dd';
    const isPortal = type === 'portal';
    const isTransfer = type === 'transfer';

    const { data: ddActionData, isLoading: ddLoading } = useDDActionFormData(isDd ? instrumentId : 0);
    const { data: ddFollowup } = useDDFollowupData(isDd ? instrumentId : 0);

    const { data: portalActionData, isLoading: portalLoading } = usePayOnPortalActionFormData(isPortal ? instrumentId : 0);
    const { data: portalFollowup } = usePayOnPortalFollowupData(isPortal ? instrumentId : 0);

    const { data: transferActionData, isLoading: transferLoading } = useBankTransferActionFormData(isTransfer ? instrumentId : 0);
    const { data: transferFollowup } = useBankTransferFollowupData(isTransfer ? instrumentId : 0);

    const isLoading = (isDd && ddLoading) || (isPortal && portalLoading) || (isTransfer && transferLoading);

    if (!id || !instrumentId || !type) {
        return (
            <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>Invalid instrument ID or type</AlertDescription>
            </Alert>
        );
    }

    if (isLoading) {
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

    const instrumentData = (ddActionData || portalActionData || transferActionData) ? {
        tenderNo: (ddActionData || portalActionData || transferActionData)?.tenderNo ?? undefined,
        tenderName: (ddActionData || portalActionData || transferActionData)?.tenderName ?? undefined,
        amount: (ddActionData || portalActionData || transferActionData)?.amount ?? undefined,
        tenderStatusName: (ddActionData || portalActionData || transferActionData)?.tenderStatusName ?? undefined,
    } : undefined;

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle>
                            {isDd ? 'Demand Draft' : isPortal ? 'Pay on Portal' : 'Bank Transfer'} Action Form
                        </CardTitle>
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
                        <Button variant="outline" onClick={() => navigate('/bi-dashboard/tender-fee')}>
                            <ArrowLeft className="mr-2 h-4 w-4" /> Back
                        </Button>
                    </CardAction>
                </div>
            </CardHeader>
            <CardContent>
                {isDd && ddActionData && (
                    <DemandDraftActionForm
                        instrumentId={instrumentId}
                        action={ddActionData.action ?? null}
                        instrumentData={instrumentData}
                        tenderId={ddActionData.tenderId ?? null}
                        linkedCheque={ddActionData.linkedCheque ?? null}
                        formHistory={ddActionData ? {
                            accountsForm: {
                                ddReq: ddActionData.ddStatus === 'Rejected' ? 'Rejected' :
                                    ddActionData.ddStatus === 'Accepted' ? 'Accepted' :
                                    ddActionData.ddRemarks ? 'Accepted' : undefined,
                                reasonReq: ddActionData.ddStatus === 'Rejected' ? (ddActionData as any).rejectionReason ?? undefined : undefined,
                                ddNo: ddActionData.ddNo ?? undefined,
                                ddDate: ddActionData.ddDate ? new Date(ddActionData.ddDate).toISOString() : undefined,
                                reqNo: ddActionData.reqNo ?? undefined,
                                remarks: ddActionData.ddRemarks ?? undefined,
                            },
                            initiateFollowup: ddFollowup ? {
                                organisationName: ddFollowup.organisationName ?? undefined,
                                contacts: ddFollowup.contacts ?? [],
                                followupStartDate: ddFollowup.followupStartDate ? new Date(ddFollowup.followupStartDate).toISOString() : undefined,
                                frequency: ddFollowup.frequency ?? undefined,
                            } : undefined,
                        } : undefined}
                    />
                )}
                {isPortal && portalActionData && (
                    <PayOnPortalActionForm
                        instrumentId={instrumentId}
                        action={portalActionData.action ?? null}
                        instrumentData={instrumentData}
                        tenderId={portalActionData.tenderId ?? null}
                        formHistory={portalActionData ? {
                            accountsForm: {
                                popReq: portalActionData.popStatus === 'Rejected' ? 'Rejected' : portalActionData.popStatus === 'Accepted' ? 'Accepted' : undefined,
                                reasonReq: (portalActionData as any).rejectionReason ?? undefined,
                            },
                            initiateFollowup: portalFollowup ? {
                                organisationName: portalFollowup.organisationName ?? undefined,
                                contacts: portalFollowup.contacts ?? [],
                                followupStartDate: portalFollowup.followupStartDate ? new Date(portalFollowup.followupStartDate).toISOString() : undefined,
                                frequency: portalFollowup.frequency ?? undefined,
                            } : undefined,
                        } : undefined}
                    />
                )}
                {isTransfer && transferActionData && (
                    <BankTransferActionForm
                        instrumentId={instrumentId}
                        action={transferActionData.action ?? null}
                        instrumentData={instrumentData}
                        tenderId={transferActionData.tenderId ?? null}
                        formHistory={transferActionData ? {
                            accountsForm: {
                                btReq: (transferActionData as any).btStatus === 'Rejected' ? 'Rejected' : (transferActionData as any).btStatus === 'Accepted' ? 'Accepted' : undefined,
                                reasonReq: (transferActionData as any).rejectionReason ?? undefined,
                            },
                            initiateFollowup: transferFollowup ? {
                                organisationName: transferFollowup.organisationName ?? undefined,
                                contacts: transferFollowup.contacts ?? [],
                                followupStartDate: transferFollowup.followupStartDate ? new Date(transferFollowup.followupStartDate).toISOString() : undefined,
                                frequency: transferFollowup.frequency ?? undefined,
                            } : undefined,
                        } : undefined}
                    />
                )}
            </CardContent>
        </Card>
    );
};

export default TenderFeeActionPage;
