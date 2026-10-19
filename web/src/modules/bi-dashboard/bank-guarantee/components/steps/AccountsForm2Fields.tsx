import type { Control, FieldPath, FieldValues } from 'react-hook-form';
import { FieldWrapper } from '@/components/form/FieldWrapper';
import { SelectField } from '@/components/form/SelectField';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import DateInput from '@/components/form/DateInput';

export interface AccountsForm2Names<T extends FieldValues> {
    bgNo: FieldPath<T>;
    bgDate: FieldPath<T>;
    courierNo: FieldPath<T>;
    bg2Remark: FieldPath<T>;
    bgValidity?: FieldPath<T>;
    bgClaimPeriod?: FieldPath<T>;
}

interface AccountsForm2FieldsProps<T extends FieldValues> {
    control: Control<T>;
    names: AccountsForm2Names<T>;
    courierOptions?: Array<{ value: string; label: string }>;
}

export function AccountsForm2Fields<T extends FieldValues>({
    control,
    names,
    courierOptions,
}: AccountsForm2FieldsProps<T>) {
    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            <FieldWrapper control={control} name={names.bgNo} label="BG No.">
                {(field) => (
                    <Input {...field} value={(field.value as string | undefined) ?? ''} placeholder="Enter BG number" />
                )}
            </FieldWrapper>
            <FieldWrapper control={control} name={names.bgDate} label="BG Creation Date">
                {(field) => (
                    <DateInput
                        value={(field.value as string | undefined) ?? undefined}
                        onChange={field.onChange}
                    />
                )}
            </FieldWrapper>
            {names.bgValidity && (
                <FieldWrapper control={control} name={names.bgValidity} label="BG Validity">
                    {(field) => (
                        <DateInput
                            value={(field.value as string | undefined) ?? undefined}
                            onChange={field.onChange}
                        />
                    )}
                </FieldWrapper>
            )}
            {names.bgClaimPeriod && (
                <FieldWrapper control={control} name={names.bgClaimPeriod} label="BG Claim Period Expiry">
                    {(field) => (
                        <DateInput
                            value={(field.value as string | undefined) ?? undefined}
                            onChange={field.onChange}
                        />
                    )}
                </FieldWrapper>
            )}
            {courierOptions ? (
                <SelectField
                    label="Courier Request No."
                    control={control}
                    name={names.courierNo}
                    options={courierOptions}
                    placeholder="Select courier request number"
                    valueType="string"
                />
            ) : (
                <FieldWrapper control={control} name={names.courierNo} label="Courier Request No.">
                    {(field) => (
                        <Input {...field} value={(field.value as string | undefined) ?? ''} placeholder="Enter courier reference" />
                    )}
                </FieldWrapper>
            )}
            <FieldWrapper control={control} name={names.bg2Remark} label="Remarks">
                {(field) => (
                    <Textarea
                        {...field}
                        value={(field.value as string | undefined) ?? ''}
                        placeholder="Enter remarks"
                        className="min-h-[80px]"
                    />
                )}
            </FieldWrapper>
        </div>
    );
}
