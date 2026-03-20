import { TenderFeeSection } from "./TenderFeeSection";

interface ProcessingFeeSectionProps {
    amount: number | null | undefined;
    allowedModes: string[];
    courierAddress?: string;
    type?: 'TENDER_FEES' | 'OLD_EMD' | 'BI_OTHER_THAN_EMD';
}

export function ProcessingFeeSection({ amount, allowedModes, courierAddress, type = 'TENDER_FEES' }: ProcessingFeeSectionProps) {
    if (!amount || amount <= 0 || !allowedModes || allowedModes.length === 0) return null;

    return <TenderFeeSection prefix="processingFee" allowedModes={allowedModes} title="Processing Fee" amount={amount} courierAddress={courierAddress} type={type} />;
}
