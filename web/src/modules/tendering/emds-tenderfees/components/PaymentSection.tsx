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

interface CourierAddressData {
    courierAddress?: string | null;
    courierName?: string | null;
    courierPhone?: string | null;
    courierAddressLine1?: string | null;
    courierAddressLine2?: string | null;
    courierCity?: string | null;
    courierState?: string | null;
    courierPincode?: string | null;
}

interface PaymentSectionProps {
    purpose: 'EMD' | 'TENDER_FEES' | 'PROCESSING_FEES';
    allowedModes: string[];
    amount: number;
    type?: RequestType;
    courierAddress?: string;
    courierData?: CourierAddressData;
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
    courierData,
    defaultPurpose = purpose,
    isEditMode = false,
}: PaymentSectionProps) {
    const { control, watch, setValue } = useFormContext();
    const selectedMode = watch(`${purpose}.mode`);

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
        if (isEditMode || !courierData) return;
        const detailsPath = `${purpose}.details`;
        const fp = selectedMode === 'DD' ? 'dd' : selectedMode === 'FDR' ? 'fdr' : null;
        if (!fp) return;

        const fields: Array<{ key: string; field: string }> = [
            { key: 'courierName', field: 'CourierName' },
            { key: 'courierPhone', field: 'CourierPhone' },
            { key: 'courierAddressLine1', field: 'CourierAddressLine1' },
            { key: 'courierAddressLine2', field: 'CourierAddressLine2' },
            { key: 'courierCity', field: 'CourierCity' },
            { key: 'courierState', field: 'CourierState' },
            { key: 'courierPincode', field: 'CourierPincode' },
        ];

        for (const { key, field } of fields) {
            const value = courierData[key as keyof CourierAddressData];
            if (value) {
                const current = watch(`${detailsPath}.${fp}${field}`);
                if (!current) {
                    setValue(`${detailsPath}.${fp}${field}`, value, { shouldValidate: false });
                }
            }
        }
    }, [selectedMode, courierData, setValue, purpose, isEditMode, watch]);

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

                    {selectedMode === 'PORTAL' && <PayOnPortalForm amount={isEditMode ? undefined : amount} prefix={prefix} readOnly={!isEditMode && amount > 0} />}
                    {(selectedMode === 'BANK_TRANSFER' || selectedMode === 'BT') && <BankTransferForm amount={isEditMode ? undefined : amount} prefix={prefix} readOnly={!isEditMode && amount > 0} />}
                    {selectedMode === 'DD' && <DemandDraftForm amount={isEditMode ? undefined : amount} prefix={prefix} readOnly={!isEditMode && amount > 0} />}
                    {selectedMode === 'BG' && <BankGuaranteeForm amount={isEditMode ? undefined : amount} prefix={prefix} readOnly={!isEditMode && amount > 0} />}
                    {selectedMode === 'FDR' && <FdrForm amount={isEditMode ? undefined : amount} prefix={prefix} readOnly={!isEditMode && amount > 0} />}
                    {selectedMode === 'CHEQUE' && <ChequeForm prefix={prefix} readOnly={!isEditMode && amount > 0} />}
                </div>
            )}
        </div>
    );
}
