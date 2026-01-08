import { useEffect } from 'react';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { FieldWrapper } from '@/components/form/FieldWrapper';
import { SelectField } from '@/components/form/SelectField';
import { NumberInput } from '@/components/form/NumberInput';
import { DatePicker } from '@/components/ui/date-picker';
import { FileUploadField } from '@/components/form/FileUploadField';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { useFormContext } from 'react-hook-form';
import { Badge } from '@/components/ui/badge';
import { formatINR } from '@/hooks/useINRFormatter';
import {
    EMD_MODES,
    PURPOSE_OPTIONS,
    BG_PURPOSE_OPTIONS,
    DELIVERY_OPTIONS,
    BG_NEEDED_IN_OPTIONS,
    BANKS,
    YES_NO_OPTIONS,
    MODE_LABELS,
} from '../constants';

interface EmdSectionProps {
    allowedModes: string[];
    amount: number;
    defaultPurpose?: string;
    courierAddress?: string;
}

export function EmdSection({ allowedModes, amount, defaultPurpose = 'EMD', courierAddress }: EmdSectionProps) {
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
                    <h3 className="text-lg font-semibold">EMD (Earnest Money Deposit)</h3>
                    <Badge variant="secondary">{formatINR(amount)}</Badge>
                </div>
                <p className="text-muted-foreground text-sm">No EMD modes configured for this tender.</p>
            </div>
        );
    }

    return (
        <div className="border rounded-lg p-6 bg-muted/20">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">EMD (Earnest Money Deposit)</h3>
                <Badge variant="secondary">{formatINR(amount)}</Badge>
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
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            <SelectField
                                control={control}
                                name="emd.details.portalPurpose"
                                label="Purpose *"
                                options={PURPOSE_OPTIONS}
                                placeholder="Select Purpose"
                            />
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
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            <SelectField
                                control={control}
                                name="emd.details.btPurpose"
                                label="Purpose *"
                                options={[{ value: 'EMD', label: 'EMD' }]}
                                placeholder="EMD"
                            />
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
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
                            <SelectField
                                control={control}
                                name="emd.details.ddPurpose"
                                label="Purpose *"
                                options={PURPOSE_OPTIONS}
                                placeholder="Select Purpose"
                            />
                            <FieldWrapper control={control} name="emd.details.ddCourierAddress" label="Courier Address">
                                {(field) => <Textarea rows={2} {...field} />}
                            </FieldWrapper>
                            <FieldWrapper control={control} name="emd.details.ddCourierHours" label="Courier Time (Hours)">
                                {(field) => <NumberInput min={1} {...field} />}
                            </FieldWrapper>
                            <FieldWrapper control={control} name="emd.details.ddDate" label="DD Date">
                                {(field) => <DatePicker {...field} />}
                            </FieldWrapper>
                            <FieldWrapper control={control} name="emd.details.ddRemarks" label="Remarks">
                                {(field) => <Textarea rows={2} {...field} />}
                            </FieldWrapper>
                        </div>
                    )}

                    {/* Bank Guarantee */}
                    {selectedMode === 'BG' && (
                        <div className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                <SelectField
                                    control={control}
                                    name="emd.details.bgNeededIn"
                                    label="BG Needed In *"
                                    options={BG_NEEDED_IN_OPTIONS}
                                    placeholder="Select"
                                />
                                <SelectField
                                    control={control}
                                    name="emd.details.bgPurpose"
                                    label="Purpose *"
                                    options={BG_PURPOSE_OPTIONS}
                                    placeholder="Select Purpose"
                                />
                                <FieldWrapper control={control} name="emd.details.bgFavouring" label="BG in Favour of *">
                                    {(field) => <Input {...field} />}
                                </FieldWrapper>
                                <FieldWrapper control={control} name="emd.details.bgAddress" label="BG Address *">
                                    {(field) => <Textarea rows={2} {...field} />}
                                </FieldWrapper>
                                <FieldWrapper control={control} name="emd.details.bgExpiryDate" label="BG Expiry Date *">
                                    {(field) => <DatePicker {...field} />}
                                </FieldWrapper>
                                <FieldWrapper control={control} name="emd.details.bgClaimPeriod" label="Claim Period End *">
                                    {(field) => <DatePicker {...field} />}
                                </FieldWrapper>
                                <FieldWrapper control={control} name="emd.details.bgStampValue" label="Stamp Paper Value">
                                    {(field) => <NumberInput min={0} {...field} />}
                                </FieldWrapper>
                                <SelectField
                                    control={control}
                                    name="emd.details.bgBank"
                                    label="Bank *"
                                    options={BANKS}
                                    placeholder="Select Bank"
                                />
                                <FieldWrapper control={control} name="emd.details.bgCourierDays" label="Courier Time (Days)">
                                    {(field) => <NumberInput min={1} max={10} {...field} />}
                                </FieldWrapper>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <FieldWrapper control={control} name="emd.details.bgCourierAddress" label="Courier Address *">
                                    {(field) => <Textarea rows={2} {...field} />}
                                </FieldWrapper>
                                <div className="space-y-4">
                                    <FileUploadField
                                        control={control}
                                        name="emd.details.bgFormatFiles"
                                        label="BG Format (Max 5 files)"
                                        multiple
                                        maxFiles={5}
                                    />
                                    <FileUploadField
                                        control={control}
                                        name="emd.details.bgPoFiles"
                                        label="PO/Tender/Request Letter"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <FieldWrapper control={control} name="emd.details.bgClientUserEmail" label="User Dept. Email">
                                    {(field) => <Input type="email" {...field} />}
                                </FieldWrapper>
                                <FieldWrapper control={control} name="emd.details.bgClientCpEmail" label="C&P Dept. Email">
                                    {(field) => <Input type="email" {...field} />}
                                </FieldWrapper>
                                <FieldWrapper control={control} name="emd.details.bgClientFinanceEmail" label="Finance Dept. Email">
                                    {(field) => <Input type="email" {...field} />}
                                </FieldWrapper>
                            </div>
                        </div>
                    )}

                    {/* FDR */}
                    {selectedMode === 'FDR' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            <FieldWrapper control={control} name="emd.details.fdrFavouring" label="FDR in Favour of *">
                                {(field) => <Input {...field} />}
                            </FieldWrapper>
                            <FieldWrapper control={control} name="emd.details.fdrExpiryDate" label="FDR Expiry Date *">
                                {(field) => <DatePicker {...field} />}
                            </FieldWrapper>
                            <SelectField
                                control={control}
                                name="emd.details.fdrDeliverBy"
                                label="Deliver By *"
                                options={DELIVERY_OPTIONS}
                                placeholder="Select"
                            />
                            <SelectField
                                control={control}
                                name="emd.details.fdrPurpose"
                                label="Purpose *"
                                options={PURPOSE_OPTIONS}
                                placeholder="Select Purpose"
                            />
                            <FieldWrapper control={control} name="emd.details.fdrCourierAddress" label="Courier Address">
                                {(field) => <Textarea rows={2} {...field} />}
                            </FieldWrapper>
                            <FieldWrapper control={control} name="emd.details.fdrCourierHours" label="Courier Time (Hours)">
                                {(field) => <NumberInput min={1} {...field} />}
                            </FieldWrapper>
                            <FieldWrapper control={control} name="emd.details.fdrDate" label="FDR Date">
                                {(field) => <DatePicker {...field} />}
                            </FieldWrapper>
                        </div>
                    )}

                    {/* Cheque */}
                    {selectedMode === 'CHEQUE' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            <FieldWrapper control={control} name="emd.details.chequeFavouring" label="Cheque in Favour of *">
                                {(field) => <Input {...field} />}
                            </FieldWrapper>
                            <FieldWrapper control={control} name="emd.details.chequeDate" label="Cheque Date *">
                                {(field) => <DatePicker {...field} />}
                            </FieldWrapper>
                            <SelectField
                                control={control}
                                name="emd.details.chequeNeededIn"
                                label="Cheque Needed In *"
                                options={DELIVERY_OPTIONS}
                                placeholder="Select"
                            />
                            <SelectField
                                control={control}
                                name="emd.details.chequePurpose"
                                label="Purpose *"
                                options={PURPOSE_OPTIONS}
                                placeholder="Select Purpose"
                            />
                            <FieldWrapper control={control} name="emd.details.chequeAccount" label="Debit from Account">
                                {(field) => <Input {...field} />}
                            </FieldWrapper>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
