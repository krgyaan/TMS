import { FieldWrapper } from '@/components/form/FieldWrapper';
import { SelectField } from '@/components/form/SelectField';
import { NumberInput } from '@/components/form/NumberInput';
import { Input } from '@/components/ui/input';
import { useFormContext } from 'react-hook-form';
import { PURPOSE_OPTIONS } from '../constants';

interface PaymentFormBaseProps {
    amount?: number;
    prefix?: string;
}

export function BankTransferForm({ amount, prefix = 'emd.details' }: PaymentFormBaseProps) {
    const { control } = useFormContext();

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 items-start">
            <SelectField
                control={control}
                name={`${prefix}.btPurpose`}
                label="Purpose *"
                options={PURPOSE_OPTIONS}
                placeholder="Select Purpose"
            />
            <FieldWrapper control={control} name={`${prefix}.btAmount`} label="Amount *">
                {(field) => (
                    <NumberInput
                        value={field.value ?? amount}
                        placeholder={amount ? String(amount) : "Enter amount"}
                        onChange={field.onChange}
                    />
                )}
            </FieldWrapper>
            <FieldWrapper control={control} name={`${prefix}.btAccountName`} label="Account Name *">
                {(field) => <Input {...field} placeholder="e.g., Individual or Company Name" />}
            </FieldWrapper>
            <FieldWrapper control={control} name={`${prefix}.btAccountNo`} label="Account Number *">
                {(field) => <Input {...field} placeholder="e.g., 1234567890" />}
            </FieldWrapper>
            <FieldWrapper control={control} name={`${prefix}.btIfsc`} label="IFSC Code *">
                {(field) => <Input {...field} placeholder="e.g., SBIN0001234" />}
            </FieldWrapper>
        </div>
    );
}