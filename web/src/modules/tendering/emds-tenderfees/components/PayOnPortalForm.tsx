import { FieldWrapper } from '@/components/form/FieldWrapper';
import { SelectField } from '@/components/form/SelectField';
import { NumberInput } from '@/components/form/NumberInput';
import { Input } from '@/components/ui/input';
import { useFormContext } from 'react-hook-form';
import { PURPOSE_OPTIONS, YES_NO_OPTIONS } from '../constants';

interface PaymentFormBaseProps {
    amount?: number;
    prefix?: string;
}

export function PayOnPortalForm({ amount, prefix = 'emd.details' }: PaymentFormBaseProps) {
    const { control } = useFormContext();

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 items-start">
            <SelectField
                control={control}
                name={`${prefix}.portalPurpose`}
                label="Purpose *"
                options={PURPOSE_OPTIONS}
                placeholder="Select Purpose"
            />
            <FieldWrapper control={control} name={`${prefix}.portalAmount`} label="Amount *">
                {(field) => (
                    <NumberInput
                        value={field.value ?? amount}
                        onChange={field.onChange}
                    />
                )}
            </FieldWrapper>
            <FieldWrapper control={control} name={`${prefix}.portalName`} label="Portal/Website Name *">
                {(field) => <Input placeholder="e.g., gem.gov.in" {...field} />}
            </FieldWrapper>
            <SelectField
                control={control}
                name={`${prefix}.portalNetBanking`}
                label="Net Banking Available *"
                options={YES_NO_OPTIONS}
                placeholder="Select"
            />
            <SelectField
                control={control}
                name={`${prefix}.portalDebitCard`}
                label="Debit Card Allowed *"
                options={YES_NO_OPTIONS}
                placeholder="Select"
            />
        </div>
    );
}