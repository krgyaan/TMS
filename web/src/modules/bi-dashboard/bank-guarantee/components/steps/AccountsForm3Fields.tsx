import type { Control, FieldPath, FieldValues } from 'react-hook-form';
import { FieldWrapper } from '@/components/form/FieldWrapper';
import { SelectField } from '@/components/form/SelectField';
import { Input } from '@/components/ui/input';
import { NumberInput } from '@/components/form/NumberInput';
import { FileUploader } from '@/components/file-upload';
import { toFileArray } from '@/modules/bi-dashboard/bank-guarantee/helpers/bankGuarantee.types';
import DateInput from '@/components/form/DateInput';

const FDR_PERCENTAGE_OPTIONS = [
    { value: '10', label: '10%' },
    { value: '15', label: '15%' },
    { value: '100', label: '100%' },
];

export interface AccountsForm3Names<T extends FieldValues> {
    fdrPer: FieldPath<T>;
    fdrAmt: FieldPath<T>;
    fdrNo: FieldPath<T>;
    fdrRoi: FieldPath<T>;
    fdrValidity: FieldPath<T>;
    fdrCopy: FieldPath<T>;
    sfmsConf: FieldPath<T>;
    bgChargeDeducted: FieldPath<T>;
    sfmsChargeDeducted: FieldPath<T>;
    stampChargeDeducted: FieldPath<T>;
    otherChargeDeducted: FieldPath<T>;
}

interface AccountsForm3FieldsProps<T extends FieldValues> {
    control: Control<T>;
    names: AccountsForm3Names<T>;
    disabled?: boolean;
    fdrValueType?: 'auto' | 'string' | 'number';
}

export function AccountsForm3Fields<T extends FieldValues>({
    control,
    names,
    disabled,
    fdrValueType = 'auto',
}: AccountsForm3FieldsProps<T>) {
    return (
        <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2 gap-y-4 items-start">
                <SelectField
                    label="FDR Percentage"
                    control={control}
                    name={names.fdrPer}
                    options={FDR_PERCENTAGE_OPTIONS}
                    placeholder="Select percentage"
                    valueType={fdrValueType}
                />
                <FieldWrapper control={control} name={names.fdrAmt} label="FDR Amount">
                    {(field) => (
                        <NumberInput
                            {...field}
                            value={field.value as number | null | undefined}
                            placeholder="Enter amount"
                        />
                    )}
                </FieldWrapper>
                <FieldWrapper control={control} name={names.fdrNo} label="FDR No.">
                    {(field) => (
                        <Input {...field} value={(field.value as string | undefined) ?? ''} placeholder="Enter FDR number" />
                    )}
                </FieldWrapper>
                <FieldWrapper control={control} name={names.fdrValidity} label="FDR Validity">
                    {(field) => (
                        <DateInput
                            value={(field.value as string | undefined) ?? undefined}
                            onChange={field.onChange}
                        />
                    )}
                </FieldWrapper>
                <FieldWrapper control={control} name={names.fdrRoi} label="FDR ROI%">
                    {(field) => (
                        <NumberInput
                            {...field}
                            value={field.value as number | null | undefined}
                            placeholder="Enter ROI"
                        />
                    )}
                </FieldWrapper>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-3">
                <FieldWrapper control={control} name={names.fdrCopy} label="FDR Copy">
                    {(field) => (
                        <FileUploader
                            context="bg-fdr-copy"
                            value={toFileArray(field.value)}
                            onChange={field.onChange}
                            disabled={disabled}
                        />
                    )}
                </FieldWrapper>
                <FieldWrapper control={control} name={names.sfmsConf} label="SFMS Confirmation">
                    {(field) => (
                        <FileUploader
                            context="bg-sfms-conf"
                            value={toFileArray(field.value)}
                            onChange={field.onChange}
                            disabled={disabled}
                        />
                    )}
                </FieldWrapper>
            </div>

            <h5 className="font-medium text-sm mt-4">Charges</h5>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FieldWrapper control={control} name={names.bgChargeDeducted} label="BG Charges Deducted">
                    {(field) => (
                        <NumberInput
                            {...field}
                            value={field.value as number | null | undefined}
                            placeholder="Enter charges"
                        />
                    )}
                </FieldWrapper>
                <FieldWrapper control={control} name={names.sfmsChargeDeducted} label="SFMS Charges Deducted">
                    {(field) => (
                        <NumberInput
                            {...field}
                            value={field.value as number | null | undefined}
                            placeholder="Enter charges"
                        />
                    )}
                </FieldWrapper>
                <FieldWrapper control={control} name={names.stampChargeDeducted} label="Stamp Paper Charges Deducted">
                    {(field) => (
                        <NumberInput
                            {...field}
                            value={field.value as number | null | undefined}
                            placeholder="Enter charges"
                        />
                    )}
                </FieldWrapper>
                <FieldWrapper control={control} name={names.otherChargeDeducted} label="Other Charges Deducted">
                    {(field) => (
                        <NumberInput
                            {...field}
                            value={field.value as number | null | undefined}
                            placeholder="Enter charges"
                        />
                    )}
                </FieldWrapper>
            </div>
        </>
    );
}
