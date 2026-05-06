import { useEffect, useMemo } from 'react';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { FieldWrapper } from '@/components/form/FieldWrapper';
import { useFormContext } from 'react-hook-form';
import { formatINR } from '@/hooks/useINRFormatter';
import { MODE_LABELS } from '../constants';
import { BankTransferForm } from './BankTransferForm';
import { PayOnPortalForm } from './PayOnPortalForm';
import { DemandDraftForm } from './DemandDraftForm';
import { BankGuaranteeForm } from './BankGuaranteeForm';
import { FdrForm } from './FdrForm';
import { ChequeForm } from './ChequeForm';

export type RequestType = 'TMS' | 'OTHER_THAN_TMS' | 'OTHER_THAN_TENDER' | 'OLD_ENTRY';

interface PaymentSectionProps {
    purpose: 'EMD' | 'TENDER_FEES' | 'PROCESSING_FEES';
    allowedModes: string[];
    amount: number;
    type?: RequestType;
    courierAddress?: string;
    defaultPurpose?: string;
    isEditMode?: boolean;
}

const OLD_ENTRY_MODES = ['DD', 'FDR', 'BG'];

export function PaymentSection({
    purpose,
    allowedModes,
    amount,
    type = 'TMS',
    courierAddress,
    defaultPurpose = purpose,
    isEditMode = false,
}: PaymentSectionProps) {
    const { control, watch, setValue } = useFormContext();
    const selectedMode = watch(`${purpose}.mode`);
    const currentDdCourierAddress = watch(`${purpose}.details.ddCourierAddress`);

    const filteredModes = useMemo(() => {
        if (type === 'OLD_ENTRY') {
            return allowedModes.filter(mode => OLD_ENTRY_MODES.includes(mode));
        }
        return allowedModes;
    }, [type, allowedModes]);

    useEffect(() => {
        if (!selectedMode || isEditMode) return;

        const setAmountAndPurpose = (amountField: string, purposeField: string) => {
            setValue(amountField, amount, { shouldValidate: false });
            setValue(purposeField, defaultPurpose, { shouldValidate: false });
        };

        if (selectedMode === 'BG') {
            setAmountAndPurpose(`${purpose}.details.bgAmount`, `${purpose}.details.bgPurpose`);
        } else if (selectedMode === 'DD') {
            setAmountAndPurpose(`${purpose}.details.ddAmount`, `${purpose}.details.ddPurpose`);
        } else if (selectedMode === 'FDR') {
            setAmountAndPurpose(`${purpose}.details.fdrAmount`, `${purpose}.details.fdrPurpose`);
        } else if (selectedMode === 'BANK_TRANSFER') {
            setAmountAndPurpose(`${purpose}.details.btAmount`, `${purpose}.details.btPurpose`);
        } else if (selectedMode === 'PORTAL') {
            setAmountAndPurpose(`${purpose}.details.portalAmount`, `${purpose}.details.portalPurpose`);
        } else if (selectedMode === 'CHEQUE') {
            setAmountAndPurpose(`${purpose}.details.chequeAmount`, `${purpose}.details.chequePurpose`);
        }
    }, [selectedMode, setValue, defaultPurpose, purpose, amount, isEditMode]);

    useEffect(() => {
        if (selectedMode === 'DD' && courierAddress && !currentDdCourierAddress) {
            setValue(`${purpose}.details.ddCourierAddress`, courierAddress);
        }
    }, [selectedMode, courierAddress, currentDdCourierAddress, setValue, purpose]);

    if (filteredModes.length === 0) {
        return (
            <div className="border rounded-lg p-6 bg-muted/20">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold">
                        {purpose === 'EMD' ? 'EMD' : purpose === 'TENDER_FEES' ? 'Tender Fee' : 'Processing Fee'} {amount > 0 ? `of ${formatINR(amount)}` : ''}
                    </h3>
                </div>
                <p className="text-muted-foreground text-sm">No payment modes configured for this tender.</p>
            </div>
        );
    }

    const prefix = `${purpose}.details`;

    return (
        <div className="border rounded-lg p-6 bg-muted/20">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">
                    {purpose === 'EMD' ? 'EMD' : purpose === 'TENDER_FEES' ? 'Tender Fee' : 'Processing Fee'} {amount > 0 ? `of ${formatINR(amount)}` : ''}
                </h3>
            </div>

            <FieldWrapper control={control} name={`${purpose}.mode`} label="Select Payment Mode">
                {() => (
                    <RadioGroup
                        value={selectedMode || ''}
                        onValueChange={(v) => setValue(`${purpose}.mode`, v)}
                        className="flex flex-wrap gap-6"
                    >
                        {filteredModes.map((mode) => (
                            <div key={mode} className="flex items-center space-x-2">
                                <RadioGroupItem value={mode} id={`${purpose}-${mode}`} />
                                <Label htmlFor={`${purpose}-${mode}`} className="cursor-pointer">
                                    {MODE_LABELS[mode]}
                                </Label>
                            </div>
                        ))}
                    </RadioGroup>
                )}
            </FieldWrapper>

            {selectedMode && (
                <div className="mt-6 pl-4 border-l-4 border-primary/50">
                    <p className="text-sm text-muted-foreground mb-4">
                        Fill in the details for <strong>{MODE_LABELS[selectedMode] || selectedMode}</strong>
                    </p>

                    {selectedMode === 'PORTAL' && <PayOnPortalForm amount={isEditMode ? undefined : amount} prefix={prefix} />}
                    {selectedMode === 'BANK_TRANSFER' || selectedMode === 'BT' && <BankTransferForm amount={isEditMode ? undefined : amount} prefix={prefix} />}
                    {selectedMode === 'DD' && <DemandDraftForm amount={isEditMode ? undefined : amount} prefix={prefix} />}
                    {selectedMode === 'BG' && <BankGuaranteeForm amount={isEditMode ? undefined : amount} prefix={prefix} />}
                    {selectedMode === 'FDR' && <FdrForm amount={isEditMode ? undefined : amount} prefix={prefix} />}
                    {selectedMode === 'CHEQUE' && <ChequeForm prefix={prefix} />}
                </div>
            )}
        </div>
    );
}
