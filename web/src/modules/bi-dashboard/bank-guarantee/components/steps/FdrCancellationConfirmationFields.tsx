import type { Control, FieldPath, FieldValues } from 'react-hook-form';
import { FieldWrapper } from '@/components/form/FieldWrapper';
import { Input } from '@/components/ui/input';
import { NumberInput } from '@/components/form/NumberInput';
import DateInput from '@/components/form/DateInput';

export interface FdrCancellationConfirmationNames<T extends FieldValues> {
    bgFdrCancelDate: FieldPath<T>;
    bgFdrCancelAmount: FieldPath<T>;
    bgFdrCancelRefNo: FieldPath<T>;
}

interface FdrCancellationConfirmationFieldsProps<T extends FieldValues> {
    control: Control<T>;
    names: FdrCancellationConfirmationNames<T>;
}

export function FdrCancellationConfirmationFields<T extends FieldValues>({
    control,
    names,
}: FdrCancellationConfirmationFieldsProps<T>) {
    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2 items-start pt-3 gap-y-4">
            <FieldWrapper control={control} name={names.bgFdrCancelDate} label="Date">
                {(field) => (
                    <DateInput
                        value={(field.value as string | undefined) ?? undefined}
                        onChange={field.onChange}
                    />
                )}
            </FieldWrapper>
            <FieldWrapper control={control} name={names.bgFdrCancelAmount} label="Amount credited">
                {(field) => (
                    <NumberInput
                        {...field}
                        value={field.value as number | null | undefined}
                        placeholder="Enter amount"
                    />
                )}
            </FieldWrapper>
            <FieldWrapper control={control} name={names.bgFdrCancelRefNo} label="Bank reference No">
                {(field) => (
                    <Input {...field} value={(field.value as string | undefined) ?? ''} placeholder="Enter reference number" />
                )}
            </FieldWrapper>
        </div>
    );
}
