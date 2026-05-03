import { useEffect } from 'react';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { FieldWrapper } from '@/components/form/FieldWrapper';
import { useFormContext, useWatch } from 'react-hook-form';
import { formatINR } from '@/hooks/useINRFormatter';
import { EMD_MODES, MODE_LABELS, } from '../constants';
import { BankTransferForm } from './BankTransferForm';
import { PayOnPortalForm } from './PayOnPortalForm';
import { DemandDraftForm } from './DemandDraftForm';
import { BankGuaranteeForm } from './BankGuaranteeForm';
import { FdrForm } from './FdrForm';
import { ChequeForm } from './ChequeForm';

interface EmdSectionProps {
    allowedModes: string[];
    amount: number;
    defaultPurpose?: string;
    courierAddress?: string;
    type?: 'EMD' | 'OLD_EMD' | 'BI_OTHER_THAN_EMD';
}

export function EmdSection({ allowedModes, amount, defaultPurpose = 'EMD', courierAddress, type = 'EMD' }: EmdSectionProps) {
    const { control, watch, setValue } = useFormContext();
    const selectedMode = watch('emd.mode');
    const currentDdCourierAddress = watch('emd.details.ddCourierAddress');

    // Pre-fill purpose when mode changes
    useEffect(() => {
        if (selectedMode) {
            // Set default purpose based on mode
            if (selectedMode === 'BG') {
                setValue('emd.details.bgPurpose', defaultPurpose);
            } else if (selectedMode === 'DD') {
                setValue('emd.details.ddPurpose', defaultPurpose);
            } else if (selectedMode === 'FDR') {
                setValue('emd.details.fdrPurpose', defaultPurpose);
            } else if (selectedMode === 'BT') {
                setValue('emd.details.btPurpose', defaultPurpose);
            } else if (selectedMode === 'POP') {
                setValue('emd.details.portalPurpose', defaultPurpose);
            } else if (selectedMode === 'CHEQUE') {
                setValue('emd.details.chequePurpose', defaultPurpose);
            }
        }
    }, [selectedMode, setValue, defaultPurpose]);

    // Pre-fill DD courier address from info sheet when DD mode is selected
    useEffect(() => {
        if (selectedMode === 'DD' && courierAddress && !currentDdCourierAddress) {
            setValue('emd.details.ddCourierAddress', courierAddress);
        }
    }, [selectedMode, courierAddress, currentDdCourierAddress, setValue]);

    // Filter allowed modes to only show valid EMD modes
    const availableModes = EMD_MODES.filter(mode =>
        allowedModes.includes(mode.value)
    );

    if (availableModes.length === 0) {
        return (
            <div className="border rounded-lg p-6 bg-muted/20">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold">EMD (Earnest Money Deposit) {amount > 0 ? `of ${formatINR(amount)}` : ''}</h3>
                </div>
                <p className="text-muted-foreground text-sm">No EMD modes configured for this tender.</p>
            </div>
        );
    }

    return (
        <div className="border rounded-lg p-6 bg-muted/20">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">EMD (Earnest Money Deposit) {amount > 0 ? `of ${formatINR(amount)}` : ''}</h3>
            </div>

            {/* Mode Selection */}
            <FieldWrapper control={control} name="emd.mode" label="Select Payment Mode">
                {() => (
                    <RadioGroup
                        value={selectedMode || ''}
                        onValueChange={(v) => setValue('emd.mode', v)}
                        className="flex flex-wrap gap-6"
                    >
                        {availableModes.map((mode) => (
                            <div key={mode.value} className="flex items-center space-x-2">
                                <RadioGroupItem value={mode.value} id={`emd-${mode.value}`} />
                                <Label htmlFor={`emd-${mode.value}`} className="cursor-pointer">
                                    {mode.label}
                                </Label>
                            </div>
                        ))}
                    </RadioGroup>
                )}
            </FieldWrapper>

            {/* Mode-specific Fields */}
            {selectedMode && (
                <div className="mt-6 pl-4 border-l-4 border-primary/50">
                    <p className="text-sm text-muted-foreground mb-4">
                        Fill in the details for <strong>{MODE_LABELS[selectedMode] || selectedMode}</strong>
                    </p>

                    {/* Portal Payment */}
                    {selectedMode === 'POP' && (
                        <PayOnPortalForm
                            control={control}
                            showPurposeAmount={type === 'OLD_EMD' || type === 'BI_OTHER_THAN_EMD'}
                        />
                    )}

                    {/* Bank Transfer */}
                    {selectedMode === 'BT' && (
                        <BankTransferForm
                            control={control}
                            showPurposeAmount={type === 'OLD_EMD' || type === 'BI_OTHER_THAN_EMD'}
                        />
                    )}

                    {/* Demand Draft */}
                    {selectedMode === 'DD' && (
                        <DemandDraftForm
                            control={control}
                            showPurposeAmount={type === 'OLD_EMD' || type === 'BI_OTHER_THAN_EMD'}
                        />
                    )}

                    {/* Bank Guarantee */}
                    {selectedMode === 'BG' && (
                        <BankGuaranteeForm
                            control={control}
                            showPurposeAmount={type === 'OLD_EMD' || type === 'BI_OTHER_THAN_EMD'}
                            setValue={setValue}
                        />
                    )}

                    {/* FDR */}
                    {selectedMode === 'FDR' && (
                        <FdrForm
                            control={control}
                            showPurposeAmount={type === 'OLD_EMD' || type === 'BI_OTHER_THAN_EMD'}
                        />
                    )}

                    {/* Cheque */}
                    {selectedMode === 'CHEQUE' && (
                        <ChequeForm
                            control={control}
                            showPurposeAmount={type === 'OLD_EMD' || type === 'BI_OTHER_THAN_EMD'}
                        />
                    )}
                </div>
            )}
        </div>
    );
}
