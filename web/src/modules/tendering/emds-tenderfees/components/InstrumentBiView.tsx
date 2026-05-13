import { Skeleton } from "@/components/ui/skeleton";
import { DemandDraftView as BiDemandDraftView } from "@/modules/bi-dashboard/demand-draft/components/DemandDraftView";
import { FdrView as BiFdrView } from "@/modules/bi-dashboard/fdr/components/FdrView";
import { BankGuaranteeView as BiBankGuaranteeView } from "@/modules/bi-dashboard/bank-guarantee/components/BankGuaranteeView";
import { ChequeView as BiChequeView } from "@/modules/bi-dashboard/cheque/components/ChequeView";
import { BankTransferView as BiBankTransferView } from "@/modules/bi-dashboard/bank-tranfer/components/BantTransferView";
import { PayOnPortalView as BiPayOnPortalView } from "@/modules/bi-dashboard/pay-on-portal/components/PayOnPortalView";
import { useDemandDraftDetails } from "@/hooks/api/useDemandDrafts";
import { useFdrDetails } from "@/hooks/api/useFdrs";
import { useBankGuaranteeDetails } from "@/hooks/api/useBankGuarantees";
import { useChequeDetails } from "@/hooks/api/useCheques";
import { useBankTransferActionFormData, useBankTransferFollowupData } from "@/hooks/api/useBankTransfers";
import { usePayOnPortalActionFormData, usePayOnPortalFollowupData } from "@/hooks/api/usePayOnPortals";

interface InstrumentBiViewProps {
    instrumentId: number;
    instrumentType: string;
}

const DDView = ({ instrumentId }: { instrumentId: number }) => {
    const { data, isLoading } = useDemandDraftDetails(instrumentId);
    if (isLoading) return <Skeleton className="h-48 w-full" />;
    if (!data) return null;
    return <BiDemandDraftView data={data} />;
};

const FDRView = ({ instrumentId }: { instrumentId: number }) => {
    const { data, isLoading } = useFdrDetails(instrumentId);
    if (isLoading) return <Skeleton className="h-48 w-full" />;
    if (!data) return null;
    return <BiFdrView data={data} />;
};

const BGView = ({ instrumentId }: { instrumentId: number }) => {
    const { data, isLoading } = useBankGuaranteeDetails(instrumentId);
    if (isLoading) return <Skeleton className="h-48 w-full" />;
    if (!data) return null;
    return <BiBankGuaranteeView data={data} />;
};

const ChequeView = ({ instrumentId }: { instrumentId: number }) => {
    const { data, isLoading } = useChequeDetails(instrumentId);
    if (isLoading) return <Skeleton className="h-48 w-full" />;
    if (!data) return null;
    return <BiChequeView data={data} />;
};

const BTView = ({ instrumentId }: { instrumentId: number }) => {
    const { data, isLoading: isDataLoading } = useBankTransferActionFormData(instrumentId);
    const { data: followupData, isLoading: isFollowupLoading } = useBankTransferFollowupData(instrumentId);
    if (isDataLoading || isFollowupLoading) return <Skeleton className="h-48 w-full" />;
    if (!data) return null;
    return <BiBankTransferView data={data as any} followupData={followupData as any} />;
};

const PortalView = ({ instrumentId }: { instrumentId: number }) => {
    const { data, isLoading: isDataLoading } = usePayOnPortalActionFormData(instrumentId);
    const { data: followupData, isLoading: isFollowupLoading } = usePayOnPortalFollowupData(instrumentId);
    if (isDataLoading || isFollowupLoading) return <Skeleton className="h-48 w-full" />;
    if (!data) return null;
    return <BiPayOnPortalView data={data as any} followupData={followupData as any} />;
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
                <div className="text-sm text-muted-foreground py-2">
                    Unknown instrument type: {instrumentType}
                </div>
            );
    }
};
