import { useEffect } from 'react';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { FieldWrapper } from '@/components/form/FieldWrapper';
import { SelectField } from '@/components/form/SelectField';
import { NumberInput } from '@/components/form/NumberInput';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { useFormContext } from 'react-hook-form';
import { Badge } from '@/components/ui/badge';
import { formatINR } from '@/hooks/useINRFormatter';
import {
    TENDER_FEE_MODES,
    DELIVERY_OPTIONS,
    YES_NO_OPTIONS,
    MODE_LABELS,
    PURPOSE_OPTIONS,
} from '../constants';
import DateInput from '@/components/form/DateInput';

interface TenderFeeSectionProps {
    prefix: 'tenderFee' | 'processingFee';
    title: string;
    allowedModes: string[];
    amount: number;
    defaultPurpose?: string;
    courierAddress?: string;
    type?: 'TENDER_FEES' | 'OLD_EMD' | 'BI_OTHER_THAN_EMD';
}

export function TenderFeeSection({
    prefix,
    title,
    allowedModes,
    amount,
    defaultPurpose = 'TENDER_FEES',
    courierAddress,
    type = 'TENDER_FEES',
}: TenderFeeSectionProps) {
    const { control, watch, setValue } = useFormContext();
    const selectedMode = watch(`${prefix}.mode`);
    const currentDdCourierAddress = watch(`${prefix}.details.ddCourierAddress`);

    // Pre-fill purpose when mode changes
    useEffect(() => {
        if (selectedMode) {
            if (selectedMode === 'DD') {
                setValue(`${prefix}.details.ddPurpose`, defaultPurpose);
            } else if (selectedMode === 'BT') {
                setValue(`${prefix}.details.btPurpose`, defaultPurpose);
            } else if (selectedMode === 'POP') {
                setValue(`${prefix}.details.portalPurpose`, defaultPurpose);
            }
        }
    }, [selectedMode, setValue, prefix, defaultPurpose]);

    // Pre-fill DD courier address from info sheet when DD mode is selected
    useEffect(() => {
        if (selectedMode === 'DD' && courierAddress && !currentDdCourierAddress) {
            setValue(`${prefix}.details.ddCourierAddress`, courierAddress);
        }
    }, [selectedMode, courierAddress, currentDdCourierAddress, setValue, prefix]);

    // Filter allowed modes
    const availableModes = TENDER_FEE_MODES.filter(mode =>
        allowedModes.includes(mode.value)
    );

    if (availableModes.length === 0) {
        return (
            <div className="border rounded-lg p-6">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold">{title}</h3>
                    {
                        amount > 0 && (
                            <Badge variant="secondary">{formatINR(amount)}</Badge>
                        )
                    }
                </div>
                <p className="text-muted-foreground text-sm">No payment modes configured for {title.toLowerCase()}.</p>
            </div>
        );
    }

    return (
        <div className="border rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">{title}</h3>
                {
                    amount > 0 && (
                        <Badge variant="secondary">{formatINR(amount)}</Badge>
                    )
                }
            </div>

            {/* Mode Selection */}
            <FieldWrapper control={control} name={`${prefix}.mode`} label="Select Payment Mode">
                {() => (
                    <RadioGroup
                        value={selectedMode || ''}
                        onValueChange={(v) => setValue(`${prefix}.mode`, v)}
                        className="flex flex-wrap gap-6"
                    >
                        {availableModes.map((mode) => (
                            <div key={mode.value} className="flex items-center space-x-2">
                                <RadioGroupItem value={mode.value} id={`${prefix}-${mode.value}`} />
                                <Label htmlFor={`${prefix}-${mode.value}`} className="cursor-pointer">
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
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 items-start">
                            {
                                (type === 'OLD_EMD' || type === 'BI_OTHER_THAN_EMD') && (
                                    <>
                                        <SelectField
                                            control={control}
                                            name="emd.details.portalPurpose"
                                            label="Purpose *"
                                            options={PURPOSE_OPTIONS}
                                            placeholder="Select Purpose"
                                        />
                                        <FieldWrapper control={control} name="emd.details.amount" label="Amount *">
                                            {(field) => <NumberInput {...field} />}
                                        </FieldWrapper>
                                    </>
                                )
                            }
                            <FieldWrapper control={control} name="emd.details.portalName" label="Portal/Website Name *">
                                {(field) => <Input placeholder="e.g., gem.gov.in" {...field} />}
                            </FieldWrapper>
                            <SelectField
                                control={control}
                                name="emd.details.portalNetBanking"
                                label="Net Banking Available *"
                                options={YES_NO_OPTIONS}
                                placeholder="Select"
                            />
                            <SelectField
                                control={control}
                                name="emd.details.portalDebitCard"
                                label="Debit Card Allowed *"
                                options={YES_NO_OPTIONS}
                                placeholder="Select"
                            />
                        </div>
                    )}

                    {/* Bank Transfer */}
                    {selectedMode === 'BT' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 items-start">
                            {
                                (type === 'OLD_EMD' || type === 'BI_OTHER_THAN_EMD') && (
                                    <>
                                        <SelectField
                                            control={control}
                                            name="emd.details.btPurpose"
                                            label="Purpose *"
                                            options={PURPOSE_OPTIONS}
                                            placeholder="EMD"
                                        />
                                        <FieldWrapper control={control} name="emd.details.amount" label="Amount *">
                                            {(field) => <NumberInput {...field} />}
                                        </FieldWrapper>
                                    </>
                                )
                            }
                            <FieldWrapper control={control} name="emd.details.btAccountName" label="Account Name *">
                                {(field) => <Input {...field} />}
                            </FieldWrapper>
                            <FieldWrapper control={control} name="emd.details.btAccountNo" label="Account Number *">
                                {(field) => <Input {...field} />}
                            </FieldWrapper>
                            <FieldWrapper control={control} name="emd.details.btIfsc" label="IFSC Code *">
                                {(field) => <Input {...field} placeholder="e.g., SBIN0001234" />}
                            </FieldWrapper>
                        </div>
                    )}

                    {/* Demand Draft */}
                    {selectedMode === 'DD' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 items-start">
                            {
                                (type === 'OLD_EMD' || type === 'BI_OTHER_THAN_EMD') && (
                                    <>
                                        <SelectField
                                            control={control}
                                            name="emd.details.ddPurpose"
                                            label="Purpose *"
                                            options={PURPOSE_OPTIONS}
                                            placeholder="Select Purpose"
                                        />
                                        <FieldWrapper control={control} name="emd.details.amount" label="Amount *">
                                            {(field) => <NumberInput {...field} />}
                                        </FieldWrapper>
                                    </>
                                )
                            }
                            <FieldWrapper control={control} name="emd.details.ddFavouring" label="DD in Favour of *">
                                {(field) => <Input {...field} />}
                            </FieldWrapper>
                            <FieldWrapper control={control} name="emd.details.ddPayableAt" label="Payable At *">
                                {(field) => <Input {...field} />}
                            </FieldWrapper>
                            <SelectField
                                control={control}
                                name="emd.details.ddDeliverBy"
                                label="Deliver By *"
                                options={DELIVERY_OPTIONS}
                                placeholder="Select"
                            />
                            <FieldWrapper control={control} name="emd.details.ddCourierAddress" label="Courier Address">
                                {(field) => <Textarea rows={2} {...field} />}
                            </FieldWrapper>
                            <FieldWrapper control={control} name="emd.details.ddCourierHours" label="Courier Time (Hours)" description="Enter the number of hours required for the courier to deliver the DD.">
                                {(field) => <NumberInput min={1} {...field} />}
                            </FieldWrapper>
                            <FieldWrapper control={control} name="emd.details.ddDate" label="DD Date">
                                {(field) => <DateInput value={field.value || null} onChange={field.onChange} />}
                            </FieldWrapper>
                            <FieldWrapper control={control} name="emd.details.ddRemarks" label="Remarks">
                                {(field) => <Textarea rows={2} {...field} />}
                            </FieldWrapper>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
