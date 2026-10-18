import type { Control, FieldPath, FieldValues } from 'react-hook-form';
import { FieldWrapper } from '@/components/form/FieldWrapper';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { NumberInput } from '@/components/form/NumberInput';
import { CompactFileUploader } from '@/components/file-upload';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import DateInput from '@/components/form/DateInput';

const ReadOnlyValue = ({ label, value, type }: {
    label: string;
    value?: string | number | null;
    type?: 'text' | 'number' | 'date';
}) => (
    <div className="grid gap-2">
        <Label className="inline-flex items-center flex-wrap">{label}</Label>
        <Input type={type ?? 'text'} value={value ?? ''} readOnly tabIndex={-1} className="bg-muted" />
    </div>
);

export interface RequestExtensionNames<T extends FieldValues> {
    extLetter: FieldPath<T>;
    newStampChargeDeducted: FieldPath<T>;
    newBgBankName: FieldPath<T>;
    newBgAmt: FieldPath<T>;
    newBgExpiry: FieldPath<T>;
    newBgClaim: FieldPath<T>;
    modificationRequired?: FieldPath<T>;
}

export interface RequestExtensionPrevValues {
    stampCharges?: string | number | null;
    beneficiaryName?: string | number | null;
    amount?: string | number | null;
    expiryDate?: string | number | null;
    claimDate?: string | number | null;
}

interface RequestExtensionFieldsProps<T extends FieldValues> {
    control: Control<T>;
    names: RequestExtensionNames<T>;
    modificationRequired?: string;
    prevValues?: RequestExtensionPrevValues;
    disabled?: boolean;
}

export function RequestExtensionFields<T extends FieldValues>({
    control,
    names,
    modificationRequired,
    prevValues,
    disabled,
}: RequestExtensionFieldsProps<T>) {
    const showNewValues = !names.modificationRequired || modificationRequired === 'Yes';

    const newValues = (
        <>
            <FieldWrapper control={control} name={names.newStampChargeDeducted} label="Stamp Paper Amount">
                {(field) => (
                    <NumberInput
                        {...field}
                        value={field.value as number | null | undefined}
                        placeholder="Enter amount"
                    />
                )}
            </FieldWrapper>
            <FieldWrapper control={control} name={names.newBgBankName} label="Bank Name">
                {(field) => (
                    <Input {...field} value={(field.value as string | undefined) ?? ''} placeholder="Enter bank name" />
                )}
            </FieldWrapper>
            <FieldWrapper control={control} name={names.newBgAmt} label="Amount">
                {(field) => (
                    <NumberInput
                        {...field}
                        value={field.value as number | null | undefined}
                        placeholder="Enter amount"
                    />
                )}
            </FieldWrapper>
            <FieldWrapper control={control} name={names.newBgExpiry} label="Expiry Date">
                {(field) => (
                    <DateInput
                        value={(field.value as string | undefined) ?? undefined}
                        onChange={field.onChange}
                    />
                )}
            </FieldWrapper>
            <FieldWrapper control={control} name={names.newBgClaim} label="Claim Date">
                {(field) => (
                    <DateInput
                        value={(field.value as string | undefined) ?? undefined}
                        onChange={field.onChange}
                    />
                )}
            </FieldWrapper>
        </>
    );

    return (
        <>
            {names.modificationRequired && (
                <FieldWrapper control={control} name={names.modificationRequired} label="Modification Required">
                    {(field) => (
                        <RadioGroup
                            value={field.value as string | undefined}
                            onValueChange={field.onChange}
                            className="flex gap-6"
                        >
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="Yes" id="mod_yes" />
                                <Label htmlFor="mod_yes">Yes</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="No" id="mod_no" />
                                <Label htmlFor="mod_no">No</Label>
                            </div>
                        </RadioGroup>
                    )}
                </FieldWrapper>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-2 items-start pt-3 gap-y-4">
                <FieldWrapper control={control} name={names.extLetter} label="Request Letter/email from Client">
                    {(field) => (
                        <CompactFileUploader
                            context="bg-ext-letter"
                            value={field.value as string | undefined}
                            onChange={field.onChange}
                            disabled={disabled}
                        />
                    )}
                </FieldWrapper>

                {showNewValues &&
                    (names.modificationRequired ? (
                        <>
                            {prevValues && (
                                <div className="space-y-4 border rounded-lg p-4 bg-red-200/10">
                                    <Label className="text-base font-semibold">Previous Values</Label>
                                    <div className="grid grid-cols-1 gap-4">
                                        <ReadOnlyValue label="Stamp Paper Amount" type="number" value={prevValues.stampCharges} />
                                        <ReadOnlyValue label="Bank Name" value={prevValues.beneficiaryName} />
                                        <ReadOnlyValue label="Amount" type="number" value={prevValues.amount} />
                                        <ReadOnlyValue label="Expiry Date" type="date" value={prevValues.expiryDate} />
                                        <ReadOnlyValue label="Claim Date" type="date" value={prevValues.claimDate} />
                                    </div>
                                </div>
                            )}
                            <div className="space-y-4 border rounded-lg p-4 bg-green-200/10">
                                <Label className="text-base font-semibold">New Values</Label>
                                <div className="grid grid-cols-1 gap-4">{newValues}</div>
                            </div>
                        </>
                    ) : (
                        newValues
                    ))}
            </div>
        </>
    );
}
