import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { DemandDraftView as BiDemandDraftView } from "@/modules/bi-dashboard/demand-draft/components/DemandDraftView";
import { FdrView as BiFdrView } from "@/modules/bi-dashboard/fdr/components/FdrView";
import { BankGuaranteeView as BiBankGuaranteeView } from "@/modules/bi-dashboard/bank-guarantee/components/BankGuaranteeView";
import { ChequeView as BiChequeView } from "@/modules/bi-dashboard/cheque/components/ChequeView";
import { BankTransferView as BiBankTransferView } from "@/modules/bi-dashboard/bank-tranfer/components/BantTransferView";
import { PayOnPortalView as BiPayOnPortalView } from "@/modules/bi-dashboard/pay-on-portal/components/PayOnPortalView";
import { useDDActionFormData, useDDFollowupData } from "@/hooks/api/useDemandDrafts";
import { useFDRActionFormData, useFDRFollowupData } from "@/hooks/api/useFdrs";
import { useBGActionFormData, useBGFollowupData } from "@/hooks/api/useBankGuarantees";
import { useChequeActionFormData, useChequeFollowupData } from "@/hooks/api/useCheques";
import { useBankTransferActionFormData, useBankTransferFollowupData } from "@/hooks/api/useBankTransfers";
import { usePayOnPortalActionFormData, usePayOnPortalFollowupData } from "@/hooks/api/usePayOnPortals";

interface InstrumentBiViewProps {
    instrumentId: number;
    instrumentType: string;
}

const DDView = ({ instrumentId }: { instrumentId: number }) => {
    const { data, isLoading: isDataLoading } = useDDActionFormData(instrumentId);
    const { data: followupData, isLoading: isFollowupLoading } = useDDFollowupData(instrumentId);
    if (isDataLoading || isFollowupLoading) return <Skeleton className="h-48 w-full" />;
    if (!data) return null;
    return <BiDemandDraftView data={data} />;
};

const FDRView = ({ instrumentId }: { instrumentId: number }) => {
    const { data, isLoading: isDataLoading } = useFDRActionFormData(instrumentId);
    const { data: followupData, isLoading: isFollowupLoading } = useFDRFollowupData(instrumentId);
    if (isDataLoading || isFollowupLoading) return <Skeleton className="h-48 w-full" />;
    if (!data) return null;
    return <BiFdrView data={data} />;
};

const BGView = ({ instrumentId }: { instrumentId: number }) => {
    const { data, isLoading: isDataLoading } = useBGActionFormData(instrumentId);
    const { data: followupData, isLoading: isFollowupLoading } = useBGFollowupData(instrumentId);
    if (isDataLoading || isFollowupLoading) return <Skeleton className="h-48 w-full" />;
    if (!data) return null;
    return <BiBankGuaranteeView data={data} />;
};

const ChequeView = ({ instrumentId }: { instrumentId: number }) => {
    const { data, isLoading: isDataLoading } = useChequeActionFormData(instrumentId);
    const { data: followupData, isLoading: isFollowupLoading } = useChequeFollowupData(instrumentId);
    if (isDataLoading || isFollowupLoading) return <Skeleton className="h-48 w-full" />;
    if (!data) return null;
    return <BiChequeView data={data} />;
};

const BTView = ({ instrumentId }: { instrumentId: number }) => {
    const { data, isLoading: isDataLoading } = useBankTransferActionFormData(instrumentId);
    const { data: followupData, isLoading: isFollowupLoading } = useBankTransferFollowupData(instrumentId);
    if (isDataLoading || isFollowupLoading) return <Skeleton className="h-48 w-full" />;
    if (!data) return null;
    return <BiBankTransferView data={data} followupData={followupData} />;
};

const PortalView = ({ instrumentId }: { instrumentId: number }) => {
    const { data, isLoading: isDataLoading } = usePayOnPortalActionFormData(instrumentId);
    const { data: followupData, isLoading: isFollowupLoading } = usePayOnPortalFollowupData(instrumentId);
    if (isDataLoading || isFollowupLoading) return <Skeleton className="h-48 w-full" />;
    if (!data) return null;
    return <BiPayOnPortalView data={data} followupData={followupData} />;
};

export const InstrumentBiView = ({ instrumentId, instrumentType }: InstrumentBiViewProps) => {
    switch (instrumentType) {
        case 'DD':
            return <DDView instrumentId={instrumentId} />;
        case 'FDR':
            return <FDRView instrumentId={instrumentId} />;
        case 'BG':
            return <BGView instrumentId={instrumentId} />;
        case 'Cheque':
            return <ChequeView instrumentId={instrumentId} />;
        case 'Bank Transfer':
            return <BTView instrumentId={instrumentId} />;
        case 'Portal Payment':
            return <PortalView instrumentId={instrumentId} />;
        default:
            return (
                <Card>
                    <CardContent className="pt-4">
                        <p className="text-sm text-muted-foreground">
                            Unknown instrument type: {instrumentType}
                        </p>
                    </CardContent>
                </Card>
            );
    }
};
