import { TenderFeeSection } from "./TenderFeeSection";

interface ProcessingFeeSectionProps {
    amount: number | null | undefined;
    allowedModes: string[];
}

export function ProcessingFeeSection({ amount, allowedModes }: ProcessingFeeSectionProps) {
    if (!amount || amount <= 0 || !allowedModes || allowedModes.length === 0) return null;

    return <TenderFeeSection prefix="processingFee" allowedModes={allowedModes} title="Processing Fee" amount={amount} />;
}
