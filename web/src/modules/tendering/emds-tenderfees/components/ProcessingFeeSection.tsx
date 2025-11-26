import { TenderFeeSection } from "./TenderFeeSection";

interface ProcessingFeeSectionProps {
    amount: number;
    allowedModes: string[];
}

export function ProcessingFeeSection({ amount, allowedModes }: ProcessingFeeSectionProps) {
    if (!amount || amount <= 0) return null;

    return <TenderFeeSection prefix="processingFee" allowedModes={allowedModes} title="Processing Fee" />;
}

/*
"Processing Fee Mode" section with 3 radio button options:
1. Payment on Portal
2. Bank Transfer
3. Demand Draft
Here are the fields for each Processing Fee payment option:
1. Processing Fees Details:
- Amount
- DD deliver by
- Purpose of DD
- DD in favour of
- DD Payable at
- Courier Address
- Time required for courier to reach destination
2. Processing Fee Bank Transfer Details:
- Amount
- Purpose
- Account Name
- Account Number
- IFSC
3. Processing Fee Payment on Portal Details:
- Amount
- Purpose
- Name of Portal/Website
- Net Banking Available
- Yes Bank Debit Card Allowed
*/
