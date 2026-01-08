import { TenderFeeSection } from "./TenderFeeSection";

interface ProcessingFeeSectionProps {
    amount: number | null | undefined;
    allowedModes: string[];
    courierAddress?: string;
}

export function ProcessingFeeSection({ amount, allowedModes, courierAddress }: ProcessingFeeSectionProps) {
    if (!amount || amount <= 0 || !allowedModes || allowedModes.length === 0) return null;

    return <TenderFeeSection prefix="processingFee" allowedModes={allowedModes} title="Processing Fee" amount={amount} courierAddress={courierAddress} />;
}
